import { Socrates, utilitas } from './index.mjs';

const socrates = new Socrates({
    auth: (username, password) => {
        // console.log('Auth Enabled', { username, password });
        return username === 'leask' && password === 'nopassword';
    },
});

socrates.listen(8964, '', async () => {
    const { address, family, port } = socrates.address();
    const title = (await utilitas.which())?.title;
    utilitas.modLog(`Server started at ${address}${port} (${family}).`, title);
});
