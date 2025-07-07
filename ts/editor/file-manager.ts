import { updateInfo, info, error, textarea, getManager } from "./elements.js";
import { Files } from "../utils/files.js";
import { logger } from "../utils/logger.js";

export class FileManager extends Files {
    previousFiles: string[] = [];
    constructor() {
        super();
    }
    async ofFile(file: string) {
        this.setFile(await this.resolve(file));
        return this;
    }
    async write(path: string) {
        if (path === null) return;
        const content = getManager().content;
        try {
            await this.writeFile(path, content);
            this.setFile(await this.resolve(path));
            updateInfo();
            info.innerText += ' Saved!';
            setTimeout(updateInfo, 1000);
        } catch (e) {
            logger.error(e);
            error.error(`Failed to Write to ${path}`);
        }
    }
    async read(path?: string, memorize = true) {
        if (path === undefined) return;
        try {
            if (memorize) await this.remember();
            const content = await this.readFile(path);
            textarea.value = content;
            this.setFile(await this.resolve(path));
            updateInfo();
            return content;
        } catch (e) {
            logger.error(e);
            error.error(`Failed to Read from ${path}`);
        };
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
        if (event !== undefined) event.preventDefault();
        let path = this.filename;
        if (!this.valid && textarea.value === '') return;
        if (!this.valid) path = await this.requestSavePath();
        if (path !== undefined) await this.write(path);
    }
    async saveAs(event?: Event) {
        if (event !== undefined) event.preventDefault();
        const path = await this.requestSavePath();
        if (path !== undefined) await this.write(path);
    }
    async openFile(path?: string, memorize = true) {
        if (path === undefined) return;
        this.save();
        await this.read(path, memorize);
    }
    async back(event?: Event) {
        if (event !== undefined) event.preventDefault();
        await this.openFile(this.previousFiles.pop(), false);
    }
    async open(event?: Event) {
        if (event !== undefined) event.preventDefault();
        await this.openFile(await this.requestOpenPath());
    }
    async new(event?: Event) {
        if (event !== undefined) event.preventDefault();
        await this.save();
        textarea.value = '';
        this.setFile(undefined);
    }
}

export const file = new FileManager();