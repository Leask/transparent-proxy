import { Socrates, utilitas } from './index.mjs';

const meta = await utilitas.which();
const opts = { time: true };

const socrates = new Socrates({
    // auth: (username, password) => {
    //     utilitas.modLog(`Authenticate: ${username}:${password}.`, meta?.name, opts);
    //     return username === 'leask' && password === 'nopassword';
    // },
    // intercept: true,
});

socrates.listen(443, '', async () => {
    const { address, family, port } = socrates.address();
    utilitas.modLog(`Server started at ${address}${port} (${family}).`, meta?.title);
});


// import { DEFAULT_KEYS } from './lib/constants.mjs';
// import tls from 'tls';
// import fs from 'fs';

// const options = {
//     key: DEFAULT_KEYS.key,
//     cert: DEFAULT_KEYS.cert,

//     // This is necessary only if using client certificate authentication.
//     // requestCert: true,

//     // This is necessary only if the client uses a self-signed certificate.
//     // ca: [fs.readFileSync('client-cert.pem')]
// };

// const server = tls.createServer(options, (socket) => {
//     console.log('server connected',
//         socket.authorized ? 'authorized' : 'unauthorized');
//     socket.write('welcome!\n');
//     socket.setEncoding('utf8');
//     socket.pipe(socket);
// });
// server.listen(8000, () => {
//     console.log('server bound');
// });




// import https from 'https';
// import { DEFAULT_KEYS } from './lib/constants.mjs';

// const options = {
//     key: DEFAULT_KEYS.key,
//     cert: DEFAULT_KEYS.cert,
// };

// https.createServer(options, function(req, res) {
//     console.log(req.socket);
//     // console.log(req.pipe);
//     res.writeHead(200);
//     res.end("hello world\n");
// }).listen(8000);

// globalThis.socrates = socrates;

// (await import('repl')).start('> ');
