import type { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

export class AutoComplete {
    chosenFoundIndex = 0;
    found: string[] = [];
    constructor(public list: string[] = []) { }
    setList(list: string[]) {
        this.list = list;
    }
    getList(): string[] | Promise<string[]> {
        return this.list;
    }
    clear() {
        this.chosenFoundIndex = 0;
        this.found = [];
    }
    async includes(word: string) {
        return (await this.getList()).includes(word);
    }
    async completeInclude(start: string) {
        return await this.complete(start, !await this.includes(start));
    }
    async complete(start: string, isFirstComplete = true) {
        if (!isFirstComplete) {
            this.chosenFoundIndex++;
            this.chosenFoundIndex %= this.found.length;
        }
        else {
            this.clear();
            this.found = await this.findWords(start);
        }
        return this.found.at(this.chosenFoundIndex);
    }
    async findWords(start: string) {
        return (await this.getList()).filter(word => word.toLowerCase().startsWith(start.toLowerCase()));
    }
}

export class FileComplete extends AutoComplete {
    extra: string[] = [];
    constructor(public pathGetter: () => string | Promise<string>, public fileType?: string) {
        super([]);
    }
    withExtra(extra: string[] | string) {
        if (typeof extra === 'string') this.extra = [extra];
        else this.extra = extra;
        return this;
    }
    async getList() {
        const path = await ipcRenderer.invoke('resolve', await this.pathGetter());
        const dir = await ipcRenderer.invoke('readdir', path);
        return dir.filter(file => this.fileType === undefined
            || file.endsWith('.' + this.fileType)).concat(this.extra);
    }
}
