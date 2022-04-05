import ProxyServer from './index.mjs';

//init ProxyServer
const server = new ProxyServer({
    // intercept: true,
    verbose: true,
});

//starting server on port 8080
server.listen(8080, '0.0.0.0', function() {
    console.log('TCP-Proxy-Server started!', server.address());
});
