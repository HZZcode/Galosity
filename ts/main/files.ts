import * as fs from 'fs';
import * as path from 'path';

import { forbidden } from '../utils/assert.js';
import { configs } from './configs.js';

class FilesClass {
    static upper(pathname: string, layers: number): string {
        if (layers <= 0) return pathname;
        return this.upper(path.dirname(pathname), layers - 1);
    }

    static get directory() {
        let pathname = new URL(import.meta.url).pathname.replaceAll('\\', '/');
        if (pathname.startsWith('/')) pathname = pathname.slice(1);
        return this.upper(pathname, configs.packed ? 5 : 3);
    }

    static resolve(pathname: string, directory = this.directory) {
        return path.resolve(directory, pathname).replaceAll('\\', '/');
    }

    static async write(pathname: string, content: string) {
        pathname = this.resolve(pathname);
        await fs.promises.mkdir(path.dirname(pathname), { recursive: true });
        await fs.promises.writeFile(pathname, content, 'utf-8');
    }

    static async read(pathname: string) {
        return await fs.promises.readFile(this.resolve(pathname), 'utf-8');
    }

    static async readDir(pathname: string, withFileTypes = false):
        Promise<string[] | fs.Dirent[]> {
        return await fs.promises.readdir(this.resolve(pathname), { withFileTypes: withFileTypes as any });
    }

    static exists(pathname: string) {
        return fs.existsSync(this.resolve(pathname));
    }

    static delete(pathname: string) {
        return fs.unlinkSync(this.resolve(pathname));
    }
}

const NoFiles = forbidden('File Operation is Disabled');

interface FilesInterface {
    readDir(pathname: string, withFileTypes?: false): Promise<string[]>;
    readDir(pathname: string, withFileTypes?: true): Promise<fs.Dirent[]>;
}

export const Files = (configs.files ? FilesClass : NoFiles) as (typeof FilesClass & FilesInterface);