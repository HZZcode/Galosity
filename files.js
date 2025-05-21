const { ipcRenderer } = require('electron');

export class Files {
    filename;
    valid = false;
    constructor(filename = null) {
        this.filename = filename;
        this.valid = filename !== null;
    }
    async check() {
        if (this.filename === null) {
            this.filename = await ipcRenderer.invoke('directory') + '/?';
            this.valid = false;
        }
    }
    async getPath() {
        await this.check();
        return this.filename.split('/').filter(s => s !== '').slice(0, -1).join('/');
    }
    async getSourcePath() {
        return await this.getPath() + '/src';
    }
    async getRelative(file) {
        return await this.getPath() + '/' + file;
    }
    async getSource(file) {
        return await this.getRelative('src/' + file);
    }
}