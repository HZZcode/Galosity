import { argParser, filename, parseArgs } from './arg-parser.js';
import { configs } from './configs.js';
import { Crypto } from './crypto.js';

export async function launch() {
    parseArgs();
    if (configs.help) {
        argParser.printHelp();
        return true;
    }
    if (configs.encrypt) {
        if (filename === undefined)
            throw new Error('Encrypt needs input file');
        await Crypto.encrypt(filename);
        return true;
    }
    return false;
}