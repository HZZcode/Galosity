const { ipcRenderer } = require('electron');

export class Files {
    filename?: string;
    valid = false;
    constructor(filename?: string) {
        this.setFile(filename);
    }
    async check() {
        if (this.filename === undefined) {
            this.filename = await ipcRenderer.invoke('directory') + '/?';
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
        let path = null;
        await ipcRenderer.invoke('showSaveDialog', {
            defaultPath: 'gal.txt',
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        }).then((result: SaveDialogReturnValue) => {
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
        }).then((result: OpenDialogReturnValue) => {
            if (result.canceled) return;
            path = result.filePaths[0];
        });
        return path;
    }

    async writeFile(path: string, content: string) {
        await ipcRenderer.invoke('writeFile', path, content);
    }
    async readFile(path: string) {
        return await ipcRenderer.invoke('readFile', path);
    }
    async resolve(path: string) {
        return await ipcRenderer.invoke('resolve', path);
    }
    async hasFile(path: string) {
        return await ipcRenderer.invoke('hasFile', path);
    }
}