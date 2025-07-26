import * as fs from 'fs';
import * as path from 'path';
import { configs } from './configs.js';

class FilesClass {
    private constructor() { }

    static get directory() {
        let pathname = new URL(import.meta.url).pathname.replaceAll('\\', '/');
        if (pathname.startsWith('/')) pathname = pathname.slice(1);
        return path.dirname(path.dirname(path.dirname(pathname)));
    }

    static resolve(pathname: string) {
        return path.resolve(this.directory, pathname).replaceAll('\\', '/');
    }

    static write(pathname: string, content: string) {
        pathname = this.resolve(pathname);
        fs.mkdirSync(path.dirname(pathname), { recursive: true });
        fs.writeFileSync(pathname, content, 'utf-8');
    }

    static read(pathname: string) {
        return fs.promises.readFile(this.resolve(pathname), 'utf-8');
    }

    static readDir(pathname: string, withFileTypes: boolean = false) {
        return fs.promises.readdir(this.resolve(pathname), { withFileTypes: withFileTypes as any });
    }

    static exists(pathname: string) {
        return fs.existsSync(this.resolve(pathname));
    }

    static delete(pathname: string) {
        return fs.unlinkSync(this.resolve(pathname));
    }
}

const NoFiles = new Proxy({}, {
    get: () => {
        throw `File Operation is Disabled`;
    }
}) as typeof FilesClass;

export const Files = configs.files ? FilesClass : NoFiles;