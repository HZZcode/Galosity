import { notUndefined } from '../utils/assert.js';
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
        await Crypto.encrypt(notUndefined(filename, 'Encrypt needs input file'));
        return true;
    }
    return false;
}