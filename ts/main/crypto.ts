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

export class ScriptCrypto {
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
        return content.splitLine().map(line => isMetadata(line) ? line : handle.decrypt(line)).join('\n');
    }
}

export class Crypto {
    private constructor() { }

    static async encrypt(filename: string) {
        const content = await Files.read(filename);
        const encrypted = ScriptCrypto.encrypt(filename, content);
        await Files.write(filename + '.galcrypt', encrypted);
    }

    static async decrypt(filename: string) {
        const content = await Files.read(filename);
        return ScriptCrypto.decrypt(content);
    }
}