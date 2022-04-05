import { Socrates, utilitas } from './index.mjs';

const socrates = new Socrates({
    // intercept: true,
});

socrates.listen(8964, '', async () => {
    const { address, family, port } = socrates.address();
    const title = (await utilitas.which())?.title;
    utilitas.modLog(`Server started at ${address}${port} (${family}).`, title);
});
