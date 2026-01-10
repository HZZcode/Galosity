import { HandleError, WrapError } from '../runtime/errors.js';
import { Files } from '../runtime/files.js';
import { AutoBind } from '../utils/auto-bind.js';
import { getManager, info, textarea, updateInfo } from './elements.js';
import { textHistory } from './text-manager.js';

@AutoBind
export class FileManager extends Files {
    previousFiles: string[] = [];
    constructor() {
        super();
    }
    async ofFile(file: string) {
        this.setFile(await this.resolve(file));
        return this;
    }
    @HandleError
    @WrapError('Failed to write to file')
    async write(path?: string) {
        if (path === undefined) return;
        const content = getManager().content;
        await this.writeFile(path, content);
        this.setFile(await this.resolve(path));
        updateInfo();
        info.innerText += ' Saved!';
        setTimeout(updateInfo, 1000);
    }
    @HandleError
    @WrapError('Failed to read from file')
    async read(path?: string, memorize = true) {
        if (path === undefined) return;
        if (memorize) await this.remember();
        const content = await this.readFile(path);
        textarea.value = content;
        textHistory.clear();
        this.setFile(await this.resolve(path));
        updateInfo();
        return content;
    }
    async remember() {
        await this.check();
        const file = this.filename!;
        if (this.valid && this.previousFiles.at(-1) !== file)
            this.previousFiles.push(file);
    }
    async autoSave() {
        if (this.valid) await this.write(this.filename!);
    }
    async save(event?: Event) {
        event?.preventDefault();
        let path = this.filename;
        if (!this.valid && textarea.value === '') return;
        if (!this.valid) path = await this.requestSavePath();
        if (path !== undefined) await this.write(path);
    }
    async saveAs(event?: Event) {
        event?.preventDefault();
        const path = await this.requestSavePath();
        if (path !== undefined) await this.write(path);
    }
    async openFile(path?: string, memorize = true) {
        if (path === undefined) return;
        await this.save();
        await this.read(path, memorize);
    }
    async back(event?: Event) {
        event?.preventDefault();
        await this.openFile(this.previousFiles.pop(), false);
    }
    async open(event?: Event) {
        event?.preventDefault();
        await this.openFile(await this.requestOpenPath());
    }
    async new(event?: Event) {
        event?.preventDefault();
        await this.save();
        textarea.value = '';
        textHistory.clear();
        this.setFile(undefined);
    }
}

export const file = new FileManager();