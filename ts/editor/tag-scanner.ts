import { TextAreaManager } from "./text-manager.js";

export class TagScanner {
    manager;
    tag;
    constructor(manager: TextAreaManager, tag: string) {
        this.manager = manager;
        this.tag = tag;
    }
    scanRawList() {
        return this.manager.lines.filter(line => line.startsWith(this.tag));
    }
    scanList() {
        return this.scanRawList().map(line => line.substring(this.tag.length).trim());
    }
    scanLines(name: string) {
        return this.manager.lines.map((line, index): [string, number] => [line, index])
            .filter(entry => entry[0].startsWith(this.tag)
                && entry[0].substring(this.tag.length).trim() === name.trim())
            .map(entry => entry[1]);
    }
    scanLine(name: string) {
        const lines = this.scanLines(name);
        return lines.length === 0 ? -1 : lines[0];
    }
}
