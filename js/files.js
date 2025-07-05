const { ipcRenderer } = require('electron');

export class Files {
    filename;
    valid = false;
    constructor(filename = null) {
        this.setFile(filename);
    }
    async check() {
        if (this.filename === null) {
            this.filename = await ipcRenderer.invoke('directory') + '/?';
            this.valid = false;
        }
    }
    setFile(filename) {
        this.filename = filename;
        this.valid = filename !== null;
    }

    async getPath() {
        await this.check();
        return this.filename.split('/').filter(s => s !== '').slice(0, -1).join('/');
    }
    async getSavePath() {
        return await this.getPath() + '/save';
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

    async requestSavePath() {
        let path = null;
        await ipcRenderer.invoke('showSaveDialog', {
            defaultPath: 'gal.txt',
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        }).then(result => {
            if (result.canceled) return;
            path = result.filePath;
        });
        return path;
    }
    async requestOpenPath() {
        let path = null;
        await ipcRenderer.invoke('showOpenDialog', {
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        }).then(result => {
            if (result.canceled) return;
            path = result.filePaths[0];
        });
        return path;
    }

    async writeFile(path, content) {
        await ipcRenderer.invoke('writeFile', path, content);
    }
    async readFile(path) {
        return await ipcRenderer.invoke('readFile', path);
    }
    async resolve(path) {
        return await ipcRenderer.invoke('resolve', path);
    }
    async hasFile(path) {
        return await ipcRenderer.invoke('hasFile', path);
    }
}