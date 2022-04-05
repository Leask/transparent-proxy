import net from 'net';
import onConnectedClientHandling from './lib/onConnectedClientHandling.mjs';
import { Logger } from './lib/utilitas.mjs';
import { DEFAULT_OPTIONS } from './lib/constants.mjs';

class ProxyServer extends net.createServer {
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

export default ProxyServer;
