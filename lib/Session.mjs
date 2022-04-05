import tls from 'tls';
import { EVENTS, DEFAULT_KEYS, STRINGS } from './constants.mjs';

const { BLANK, CLRF, SEPARATOR } = STRINGS;
const { CLOSE, DATA, ERROR } = EVENTS;
const DOUBLE_CLRF = CLRF + CLRF;

/**
 *
 * @param {net.Socket} socket
 * @param data
 */
const socketWrite = (socket, data) => {
    if (socket && !socket.destroyed && data) {
        socket.write(data);
    }
}

/**
 *
 * @param {net.Socket} socket
 */
const socketDestroy = (socket) => {
    if (socket && !socket.destroyed) {
        socket.destroy();
    }
}

const parseHeaders = (data) => {
    //TODO make secure
    const dataString = data.toString();
    const [headers, body] = dataString.split(CLRF + CLRF + CLRF);
    const headerRows = headers.split(CLRF);
    const headerObject = {};
    for (let i = 0; i < headerRows.length; i++) {
        const headerRow = headerRows[i];
        if (i === 0) {   //first row contain method, path and type
            // const [method, path, version] = headerRow.split(BLANK);
            // headerObject.method = method;
            // headerObject.path = path;
            // headerObject.version = version;
        }
        else {
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
 *
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

class Session extends Object {
    /**
     *
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
        if (this._dst) {
            socketDestroy(this._dst);
        }
        if (this._src) {
            socketDestroy(this._src);
        }
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
            if (!!upstream) {
                this._tunnel.UPSTREAM = upstream;
            }
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
            })
                .on(DATA, onDataFromClient)
                .on(CLOSE, onClose)
                .on(ERROR, onClose)
            );

            this.setRequestSocket(new tls.TLSSocket(this._dst, {
                rejectUnauthorized: false,
                requestCert: false,
                isServer: false
            })
                .on(DATA, onDataFromUpstream)
                .on(CLOSE, onClose)
                .on(ERROR, onClose)
            );
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
}

export { Session, parseHeaders, rebuildHeaders };
