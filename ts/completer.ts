import { GalIpcRenderer } from "./types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

export class AutoComplete {
    list;
    chosenFoundIndex = 0;
    found: string[] = [];
    constructor(list: string[] = []) {
        this.list = list;
    }
    setList(list: string[]) {
        this.list = list;
    }
    // eslint-disable-next-line require-await
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
        return this.found[this.chosenFoundIndex];
    }
    async findWords(start: string) {
        return (await this.getList()).filter(word => word.toLowerCase().startsWith(start.toLowerCase()));
    }
}

export class FileComplete extends AutoComplete {
    pathGetter;
    fileType;
    constructor(pathGetter: () => string | Promise<string>, fileType?: string) {
        super([]);
        this.pathGetter = pathGetter;
        this.fileType = fileType;
    }
    async getList() {
        const path = await ipcRenderer.invoke('resolve', await this.pathGetter());
        const dir = await ipcRenderer.invoke('readdir', path);
        if (this.fileType === undefined) return dir;
        return dir.filter(file => file.endsWith('.' + this.fileType));
    }
}
