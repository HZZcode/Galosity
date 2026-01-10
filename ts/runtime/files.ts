import { AutoBind } from "../utils/auto-bind.js";
import { Runtime } from "./runtime.js";

@AutoBind
export class Files {
    filename?: string;
    valid = false;
    constructor(filename?: string) {
        this.setFile(filename);
    }
    async check() {
        if (this.filename === undefined) {
            this.filename = await Runtime.api.invoke('directory') + '/?';
            this.valid = false;
        }
    }
    setFile(filename?: string) {
        this.filename = filename;
        this.valid = filename !== undefined;
    }

    async getPath() {
        await this.check();
        return this.filename!.split('/').filter(s => s !== '').slice(0, -1).join('/');
    }
    async getSavePath() {
        return await this.getPath() + '/save';
    }
    async getSourcePath() {
        return await this.getPath() + '/src';
    }
    async getRelative(file: string) {
        return await this.getPath() + '/' + file;
    }
    async getSource(file: string) {
        return await this.getRelative('src/' + file);
    }

    async requestSavePath() {
        return await Runtime.api.requestSavePath({
            defaultPath: 'gal.txt',
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
    }
    async requestOpenPath() {
        return await Runtime.api.requestOpenPath({
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
    }

    async writeFile(path: string, content: string) {
        await Runtime.api.invoke('writeFile', path, content);
    }
    async writeFileEncrypted(path: string, content: string) {
        await Runtime.api.invoke('writeFileEncrypted', path, content);
    }
    async readFile(path: string) {
        return await Runtime.api.invoke('readFile', path);
    }
    async readFileDecrypted(path: string) {
        return await Runtime.api.invoke('readFileDecrypted', path);
    }
    async resolve(path: string, directory?: string) {
        return await Runtime.api.invoke('resolve', path, directory);
    }
    async hasFile(path: string) {
        return await Runtime.api.invoke('exists', path);
    }
    async delete(path: string) {
        await Runtime.api.invoke('delete', path);
    }
}