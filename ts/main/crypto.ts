import CryptoJS from 'crypto-js';

import { getMetadata, isMetadata } from "../utils/string.js";
import { Files } from "./files.js";

class CryptoHandle {
    constructor(private secretKey: string) { }

    encrypt(data: string): string {
        return CryptoJS.AES.encrypt(data, this.secretKey).toString();
    }

    decrypt(data: string): string {
        return CryptoJS.AES.decrypt(data, this.secretKey).toString(CryptoJS.enc.Utf8);
    }
}

class ScriptCrypto {
    private constructor() { }

    static encrypt(filename: string, content: string) {
        const name = filename === '' ? 'ZZ_404' : filename.replaceAll('\\', '/').split('/').at(-1)!;
        const secretKey = CryptoJS.MD5(name + new Date().getTime().toString()).toString();
        const handle = new CryptoHandle(secretKey);
        const encrypteds = content.splitLine().map(line => isMetadata(line) ? line : handle.encrypt(line));
        const metadata = `//! secretKey=${secretKey}`;
        return [metadata, ...encrypteds].join('\n');
    }

    static decrypt(content: string) {
        const metadata = getMetadata(content.splitLine());
        if (!('secretKey' in metadata)) return content;
        const handle = new CryptoHandle(metadata['secretKey']);
        return content.splitLine().filter(line => !isMetadata(line))
            .map(line => handle.decrypt(line)).join('\n');
    }
}

export class Crypto {
    private constructor() { }

    static async writeEncrypted(filename: string, content: string) {
        await Files.write(filename, ScriptCrypto.encrypt(filename, content));
    }

    static async encrypt(filename: string) {
        await this.writeEncrypted(filename + '.galcrypt', await Files.read(filename));
    }

    static async readDecrypted(filename: string) {
        return ScriptCrypto.decrypt(await Files.read(filename));
    }
}