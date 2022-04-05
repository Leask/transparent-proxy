import { isFunction, isValidASCII, Logger } from './utilitas.mjs';
import net from 'net';
import route from './route.mjs';
import tls from 'tls';

import {
    DEFAULT_KEYS, DEFAULT_OPTIONS, ERROR_CODES, EVENTS, HTTP_BODIES,
    HTTP_METHODS, HTTP_PORT, HTTP_RESPONSES, HTTP, HTTPS_PORT, HTTPS,
    SLASH_REGEXP, SLASH, STRINGS,
} from './constants.mjs';

const { AUTH_REQUIRED, NOT_FOUND, NOT_OK, OK, TIMED_OUT } = HTTP_RESPONSES;
const { BLANK, CLRF, EMPTY, PROXY_AUTH_BASIC, PROXY_AUTH, SEPARATOR } = STRINGS;
const { CLOSE, DATA, ERROR, EXIT } = EVENTS;
const { CONNECT } = HTTP_METHODS;
const { ENOTFOUND, EPIPE, EPROTO, ETIMEDOUT } = ERROR_CODES;
const DOUBLE_CLRF = CLRF + CLRF;

/**
 * @param {net.Socket} socket
 * @param data
 */
const socketWrite = (socket, data) => {
    if (socket && !socket.destroyed && data) { socket.write(data); }
};

/**
 * @param {net.Socket} socket
 */
const socketDestroy = (socket) => {
    if (socket && !socket.destroyed) { socket.destroy(); }
};

const parseHeaders = (data) => {
    // @TODO: make secure
    const dataString = data.toString();
    const [headers, body] = dataString.split(CLRF + CLRF + CLRF);
    const headerRows = headers.split(CLRF);
    const headerObject = {};
    for (let i = 0; i < headerRows.length; i++) {
        const headerRow = headerRows[i];
        if (i === 0) {
            // first row contain method, path and type
            // const [method, path, version] = headerRow.split(BLANK);
            // headerObject.method = method;
            // headerObject.path = path;
            // headerObject.version = version;
        } else {
            const [attribute, value] = headerRow.split(SEPARATOR);
            if (attribute && value) {
                const lowerAttribute = attribute.trim().toLowerCase();
                headerObject[lowerAttribute] = value.trim();
            }
        }
    }
    return headerObject;
};

/**
 * @param {Object} headersObject
 * @param {buffer} dataBuffer
 * @returns {buffer}
 */
const rebuildHeaders = (headersObject, dataBuffer) => {
    const dataString = dataBuffer.toString();
    const [headers, body] = dataString.split(DOUBLE_CLRF + CLRF, 2);
    const firstRow = headers.split(CLRF, 1)[0];
    let newData = firstRow + CLRF;
    for (const key of Object.keys(headersObject)) {
        const value = headersObject[key];
        newData += key + SEPARATOR + BLANK + value + CLRF;
    }
    newData += DOUBLE_CLRF + (body || '');
    return Buffer.from(newData);
};

/**
 * @param ipStringWithPort
 * @returns {{host: string, port: number, protocol: string, credentials: string}}
 */
const getAddressAndPortFromString = (ipStringWithPort) => {
    let [credentials, targetHost] = ipStringWithPort.split(STRINGS.AT);
    if (!targetHost) {
        targetHost = credentials;
        credentials = '';
    }
    let [protocol, host, port] = targetHost.split(STRINGS.SEPARATOR);
    if (protocol.indexOf(HTTP) === -1) {
        port = host;
        host = protocol;
        protocol = (port && parseInt(port) === HTTPS_PORT)
            ? HTTPS
            : HTTP;
    }
    host = (host) ? host : protocol.replace(SLASH_REGEXP, STRINGS.EMPTY);
    if (host.indexOf(SLASH + SLASH) === 0) { host = host.split(SLASH)[2]; }
    else { host = host.split(SLASH)[0]; }
    port = port || (protocol && ~protocol.indexOf(HTTPS) ? HTTPS_PORT : HTTP_PORT);
    return JSON.parse(JSON.stringify({
        host: host,
        port: parseInt(port),
        protocol: protocol,
        credentials: credentials || undefined
    }));
};

/**
 * Build options for native nodejs tcp-connection.
 * @param proxyToUse
 * @param upstreamHost
 * @returns {boolean|{host: string, port: number, protocol: string, credentials: string, upstreamed:boolean}}
 */
const getConnectionOptions = (proxyToUse, upstreamHost) => {
    if (isValidASCII(upstreamHost)) {
        const upstreamed = !!proxyToUse;
        const upstreamToUse = (upstreamed) ? proxyToUse : upstreamHost;
        const config = getAddressAndPortFromString(upstreamToUse);
        const objectToReturn = { ...config, ...{ upstreamed: upstreamed } };
        if (objectToReturn.upstreamed) {
            objectToReturn.upstream = getAddressAndPortFromString(upstreamHost);
        }
        if (!(objectToReturn.port >= 0 && objectToReturn.port < 65536)) {
            return false;
        }
        return objectToReturn;
    } else {
        return false;
    }
};

/**
 * @param clientSocket
 * @param bridgedConnections
 * @param options
 * @param logger
 */
const onConnectedClientHandling = (clientSocket, bridgedConnections, options, logger) => {
    const {
        upstream, tcpOutgoingAddress, injectData,
        injectResponse, auth, intercept, keys
    } = options;
    const remotePort = clientSocket.remotePort;
    const remoteAddress = clientSocket.remoteAddress;
    const remoteID = remoteAddress + SEPARATOR + remotePort;
    // logger.log('Received request from', remoteID);
    /**
     * @param {Error} err
     */
    function onClose(err) {
        const thisTunnel = bridgedConnections[remoteID];
        if (err && err instanceof Error) {
            //TODO handle more the errorCodes
            switch (err.code) {
                case ETIMEDOUT:
                    thisTunnel.clientResponseWrite(TIMED_OUT + DOUBLE_CLRF);
                    break;
                case ENOTFOUND:
                    thisTunnel.clientResponseWrite(NOT_FOUND + DOUBLE_CLRF + HTTP_BODIES.NOT_FOUND);
                    break;
                case EPIPE:
                    logger.error(remoteID, err);
                    break;
                // case EPROTO:
                //     // thisTunnel.clientResponseWrite(NOT_OK + DOUBLE_CLRF + HTTP_BODIES.NOT_FOUND);
                //     break;
                default:
                    //log all unhandled errors
                    logger.error(remoteID, err);
                    thisTunnel.clientResponseWrite(NOT_OK + DOUBLE_CLRF);
            }
        }
        if (thisTunnel) {
            thisTunnel.destroy();
            delete bridgedConnections[remoteID];
        }
    }

    /**
     * @param {buffer} dataFromUpStream
     */
    function onDataFromUpstream(dataFromUpStream) {
        const thisTunnel = bridgedConnections[remoteID];
        const responseData = isFunction(injectResponse)
            ? injectResponse(dataFromUpStream, thisTunnel)
            : dataFromUpStream;

        thisTunnel.clientResponseWrite(responseData);
        //updateSockets if needed after first response
        updateSockets();
    }

    /**
     * @param {buffer} srcData
     */
    function onDirectConnectionOpen(srcData) {
        const thisTunnel = bridgedConnections[remoteID];
        const requestData = isFunction(injectData)
            ? injectData(srcData, thisTunnel) : srcData;
        thisTunnel.clientRequestWrite(requestData);
    }

    function updateSockets() {
        const thisTunnel = bridgedConnections[remoteID];
        if (intercept
            && thisTunnel
            && thisTunnel.isHttps
            && !thisTunnel._updated) {
            const keysObject = isFunction(keys) ? keys(thisTunnel) : false;
            const keyToUse = (
                keysObject
                && typeof keysObject === 'object'
                && Object.keys(keysObject).length === 2
            ) ? keysObject : undefined;
            thisTunnel._updateSockets({
                onDataFromClient, onDataFromUpstream, onClose
            }, keyToUse);
        }
    }

    /**
     * @param {buffer} data
     * @param {string} firstHeaderRow
     * @param {boolean} isConnectMethod - false as default.
     * @returns Promise{boolean|{host: string, port: number, protocol: string, credentials: string, upstreamed: boolean}}
     */
    async function prepareTunnel(data, firstHeaderRow, isConnectMethod = false) {
        const thisTunnel = bridgedConnections[remoteID];
        const upstreamHost = firstHeaderRow.split(BLANK)[1];
        const initOpt = getConnectionOptions(false, upstreamHost);
        thisTunnel.setTunnelOpt(initOpt); //settings opt before callback
        const proxy = await route(upstream, {
            data, bridgedConnection: thisTunnel
        });
        //initializing socket and forwarding received request
        const connectionOpt = getConnectionOptions(proxy, upstreamHost);
        thisTunnel.isHttps = !!(isConnectMethod || (
            connectionOpt.upstream && connectionOpt.upstream.protocol === HTTPS
        ));
        thisTunnel.setTunnelOpt(connectionOpt); // updating tunnel opt
        if (isFunction(tcpOutgoingAddress)) {
            //THIS ONLY work if server-listener is not 0.0.0.0 but specific iFace/IP
            connectionOpt.localAddress = tcpOutgoingAddress(data, thisTunnel);
        }

        /**
         * @param {Error} connectionError
         */
        function onTunnelHTTPConnectionOpen(connectionError) {
            if (connectionError) { return onClose(connectionError); }
            if (connectionOpt.credentials) {
                const headers = parseHeaders(data);
                const basedCredentials = Buffer.from(
                    connectionOpt.credentials
                ).toString('base64'); //converting to base64
                headers[PROXY_AUTH.toLowerCase()] = PROXY_AUTH_BASIC + BLANK + basedCredentials;
                const newData = rebuildHeaders(headers, data);
                thisTunnel.clientRequestWrite(newData)
            } else { onDirectConnectionOpen(data); }
        }

        /**
         * @param {Error} connectionError
         * @returns {Promise<void>}
         */
        async function onTunnelHTTPSConnectionOpen(connectionError) {
            if (connectionError) { return onClose(connectionError); }
            if (connectionOpt.upstreamed) {
                if (connectionOpt.credentials) {
                    const headers = parseHeaders(data);
                    const basedCredentials = Buffer.from(connectionOpt.credentials).toString('base64'); //converting to base64
                    headers[PROXY_AUTH.toLowerCase()] = PROXY_AUTH_BASIC + BLANK + basedCredentials;
                    const newData = rebuildHeaders(headers, data);
                    thisTunnel.clientRequestWrite(newData)
                } else { onDirectConnectionOpen(data); }
            } else {
                // response as normal http-proxy
                thisTunnel.clientResponseWrite(OK + CLRF + CLRF);
                updateSockets();
            }
        }

        const callbackOnConnect = (isConnectMethod)
            ? onTunnelHTTPSConnectionOpen : onTunnelHTTPConnectionOpen;

        if (connectionOpt) {
            logger.log(remoteID, '=>', thisTunnel.getTunnelStats());
            const responseSocket = net.createConnection(connectionOpt, callbackOnConnect);
            thisTunnel.setRequestSocket(
                responseSocket
                    .on(DATA, onDataFromUpstream)
                    .on(CLOSE, onClose)
                    .on(ERROR, onClose)
            );
        }
        return connectionOpt;
    }

    /**
     * @param {Array<string>} split
     * @param {buffer} data
     */
    function handleProxyTunnel(split, data) {
        const firstHeaderRow = split[0];
        const thisTunnel = bridgedConnections[remoteID];
        if (~firstHeaderRow.indexOf(CONNECT)) { //managing HTTP-Tunnel(upstream) & HTTPs
            return prepareTunnel(data, firstHeaderRow, true);
        } else if (firstHeaderRow.indexOf(CONNECT) === -1
            && !thisTunnel._dst) { // managing http
            return prepareTunnel(data, firstHeaderRow);
        } else if (thisTunnel && thisTunnel._dst) {
            return onDirectConnectionOpen(data);
        }
    }

    /**
     * @param {buffer} data
     * @returns {Promise<Session|void>}
     */
    async function onDataFromClient(data) {
        const dataString = data.toString();
        const thisTunnel = bridgedConnections[remoteID];
        try {
            if (dataString && dataString.length > 0) {
                const headers = parseHeaders(data);
                const split = dataString.split(CLRF); //TODO make secure, split can be limited
                if (isFunction(auth)
                    && !thisTunnel.isAuthenticated()) {
                    const proxyAuth = headers[PROXY_AUTH.toLowerCase()];
                    if (proxyAuth) {
                        const credentials = proxyAuth.replace(PROXY_AUTH_BASIC, EMPTY);
                        const parsedCredentials = Buffer.from(credentials, 'base64').toString(); //converting from base64
                        const [username, password] = parsedCredentials.split(SEPARATOR); //TODO split can be limited
                        let isLogged = auth(username, password, thisTunnel);
                        if (isLogged instanceof Promise) { //if async operation...
                            isLogged = await isLogged; //...need to resolve promise
                        }
                        if (isLogged) {
                            thisTunnel.setUserAuthentication(username);
                            return handleProxyTunnel(split, data);
                        } else {
                            //return auth-error and close all
                            thisTunnel.clientResponseWrite(AUTH_REQUIRED + DOUBLE_CLRF + HTTP_BODIES.AUTH_REQUIRED);
                            return onClose();
                        }
                    } else {
                        return thisTunnel.clientResponseWrite(AUTH_REQUIRED + DOUBLE_CLRF);
                    }
                } else {
                    return handleProxyTunnel(split, data);
                }
            }
        } catch (err) {
            return onClose(err);
        }
    }

    bridgedConnections[remoteID] = new Session(remoteID); //initializing bridged-connection
    bridgedConnections[remoteID].setResponseSocket(
        clientSocket
            .on(DATA, onDataFromClient)
            .on(ERROR, onClose)
            .on(CLOSE, onClose)
            .on(EXIT, onClose)
    );
};

class Session extends Object {
    /**
     * @param id
     */
    constructor(id) {
        super();
        this._id = id;
        this._src = null;
        this._dst = null;
        this._tunnel = {};
        this.user = null;
        this.authenticated = false;
        this.isHttps = false;
    }

    /**
     * @param {buffer|string} data - The data to send.
     * @returns {Session}
     */
    clientRequestWrite(data) {
        socketWrite(this._dst, data);
        return this;
    }

    /**
     * @param {buffer|string} data - The data to send.
     * @returns {Session}
     */
    clientResponseWrite(data) {
        socketWrite(this._src, data);
        return this;
    }

    /**
     * Destroy existing sockets for this Session-Instance
     * @returns {Session}
     */
    destroy() {
        if (this._dst) { socketDestroy(this._dst); }
        if (this._src) { socketDestroy(this._src); }
        return this;
    }

    /**
     * Is Session authenticated by user
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.authenticated;
    }

    /**
     * Set the socket that will receive response
     * @param {net.Socket} socket
     * @returns {Session}
     */
    setResponseSocket(socket) {
        this._src = socket;
        return this;
    }

    /**
     * Set the socket that will receive request
     * @param {net.Socket} socket
     * @returns {Session}
     */
    setRequestSocket(socket) {
        this._dst = socket;
        return this;
    }

    /**
     * Get own id
     * @returns {string}
     */
    getId() {
        return this._id;
    }

    /**
     * @param {string} username
     * @returns {Session}
     */
    setUserAuthentication(username) {
        if (username) {
            this.authenticated = true;
            this.user = username;
        }
        return this;
    }

    /**
     * @param {object} options
     * @returns {Session}
     */
    setTunnelOpt(options) {
        if (options) {
            const { host, port, upstream } = options;
            this._tunnel.ADDRESS = host;
            this._tunnel.PORT = port;
            if (!!upstream) { this._tunnel.UPSTREAM = upstream; }
        }
        return this;
    }

    /**
     * @param {object} callbacksObject
     * @param {object} KEYS - {key:{string},cert:{string}}
     * @returns {Session}
     * @private
     */
    _updateSockets(callbacksObject, KEYS = DEFAULT_KEYS) {
        const { onDataFromClient, onDataFromUpstream, onClose } = callbacksObject;
        KEYS = KEYS || DEFAULT_KEYS;
        if (!this._updated) {
            this.setResponseSocket(new tls.TLSSocket(this._src, {
                rejectUnauthorized: false,
                requestCert: false,
                isServer: true,
                key: KEYS.key,
                cert: KEYS.cert
            }).on(DATA, onDataFromClient)
                .on(CLOSE, onClose)
                .on(ERROR, onClose));
            this.setRequestSocket(new tls.TLSSocket(this._dst, {
                rejectUnauthorized: false,
                requestCert: false,
                isServer: false
            }).on(DATA, onDataFromUpstream)
                .on(CLOSE, onClose)
                .on(ERROR, onClose));
            this._updated = true;
        }
        return this;
    }

    /**
     * Get Stats for this tunnel
     * @returns {object} - {ADDRESS:'String', PORT:Number, UPSTREAM:{ADDRESS,PORT}}
     */
    getTunnelStats() {
        return this._tunnel;
    }
};

class Socrates extends net.createServer {
    constructor(options) {
        const {
            upstream, tcpOutgoingAddress,
            verbose,
            injectData, injectResponse,
            auth, intercept, keys
        } = { ...DEFAULT_OPTIONS, ...options }; //merging with default options
        const logger = new Logger(verbose);
        const bridgedConnections = {};

        super(function(clientSocket) {
            onConnectedClientHandling(
                clientSocket,
                bridgedConnections,
                {
                    upstream, tcpOutgoingAddress,
                    injectData, injectResponse,
                    auth, intercept, keys
                },
                logger)
        });
        this.bridgedConnections = bridgedConnections;
    }

    getBridgedConnections() {
        return this.bridgedConnections;
    };
}

export default Socrates;
