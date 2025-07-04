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
            this.found = await this.findWords(start);
        }
        return this.found[this.chosenFoundIndex];
    }
    async findWords(start) {
        return (await this.getList()).filter(word => word.toLowerCase().startsWith(start.toLowerCase()));
    }
}
export class FileComplete extends AutoComplete {
    pathGetter;
    fileType;
    constructor(pathGetter, fileType = null) {
        super([]);
        this.pathGetter = pathGetter;
        this.fileType = fileType;
    }
    async getList() {
        const path = await ipcRenderer.invoke('resolve', await this.pathGetter());
        const dir = await ipcRenderer.invoke('readdir', path);
        if (this.fileType === null) return dir;
        return dir.filter(file => file.endsWith('.' + this.fileType));
    }
}
