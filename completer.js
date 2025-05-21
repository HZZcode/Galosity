'use strict';

const { ipcRenderer } = require('electron');

export class AutoComplete {
    list;
    chosenFoundIndex = 0;
    found = [];
    constructor(list = []) {
        this.list = list;
    }
    setList(list) {
        this.list = list;
    }
    // eslint-disable-next-line require-await
    async getList() {
        return this.list;
    }
    clear() {
        this.chosenFoundIndex = 0;
        this.found = [];
    }
    async includes(word) {
        return (await this.getList()).includes(word);
    }
    async completeInclude(start) {
        return await this.complete(start, !await this.includes(start));
    }
    async complete(start, isFirstComplete = true) {
        if (!isFirstComplete) {
            this.chosenFoundIndex++;
            this.chosenFoundIndex %= this.found.length;
        }
        else {
            this.clear();
            for (let l of await this.getList())
                if (l.toLowerCase().startsWith(start.toLowerCase()))
                    this.found.push(l);
        }
        return this.found[this.chosenFoundIndex];
    }
}
export class FileComplete extends AutoComplete {
    pathFunc;
    fileType;
    constructor(pathFunc, fileType = null) {
        super([]);
        this.pathFunc = pathFunc;
        this.fileType = fileType;
    }
    async getList() {
        let path = await ipcRenderer.invoke('resolve', await this.pathFunc());
        let dir = await ipcRenderer.invoke('readdir', path);
        if (this.fileType === null) return dir;
        return dir.filter(file => file.endsWith('.' + this.fileType));
    }
}
