import { Runtime } from "../runtime/runtime.js";

export abstract class AbstractComplete {
    chosenFoundIndex = 0;
    found: string[] = [];
    abstract getList(): string[] | Promise<string[]>;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setList(_: string[]) { }
    clear() {
        this.chosenFoundIndex = 0;
        this.found = [];
    }
    private async includes(word: string) {
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
    private async findWords(start: string) {
        return (await this.getList()).filter(word => word.toLowerCase().startsWith(start.toLowerCase()));
    }
}

export class AutoComplete extends AbstractComplete {
    constructor(public list: string[] = []) {
        super();
    }
    override getList() {
        return this.list;
    }
    override setList(list: string[]) {
        this.list = list;
    }
}

export class FileComplete extends AbstractComplete {
    extra: string[] = [];
    constructor(public pathGetter: () => string | Promise<string>, public fileType?: string) {
        super();
    }
    withExtra(extra: string[] | string) {
        if (typeof extra === 'string') this.extra = [extra];
        else this.extra = extra;
        return this;
    }
    override async getList() {
        const path = await Runtime.api.invoke('resolve', await this.pathGetter());
        const dir = await Runtime.api.invoke('readdir', path);
        return dir.filter(file => this.fileType === undefined
            || file.endsWith('.' + this.fileType)).concat(this.extra);
    }
}
