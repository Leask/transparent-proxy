import { promises as fs } from 'fs';

const [encoding] = ['utf8'];

const writeFile = async (name, data, opts) => {
    return await fs.writeFile(name, data, opts?.encoding || encoding);
};

export {
    writeFile
};
