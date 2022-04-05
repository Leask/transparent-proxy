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

socrates.listen(8964, '', async () => {
    const { address, family, port } = socrates.address();
    utilitas.modLog(`Server started at ${address}${port} (${family}).`, meta?.title);
});


// import https from 'https';
// import { DEFAULT_KEYS } from './lib/constants.mjs';

// const options = {
//     key: DEFAULT_KEYS.key,
//     cert: DEFAULT_KEYS.cert,
// };

// https.createServer(options, function(req, res) {
//     res.writeHead(200);
//     res.end("hello world\n");
// }).listen(8000);
