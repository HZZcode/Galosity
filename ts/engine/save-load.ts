import { Files } from "../utils/files.js";
import { logger } from "../utils/logger.js";
import { splitWith } from "../utils/split.js";
import { error } from "./error-handler.js";
import { Frame } from "./frame.js";

class SaveInfo {
    time;
    sourceFile;
    note;
    constructor(sourceFile: string, note = '') {
        this.time = new Date();
        this.sourceFile = sourceFile;
        this.note = note.replaceAll('\n', '');
    }
    withTime(time: Date) {
        this.time = time;
        return this;
    }
    toString() {
        return [
            this.time.getTime().toString(),
            this.sourceFile,
            this.note
        ].join('|').replaceAll('\n', '');
    }
    static fromString(str: string) {
        const [time, sourceFile, note] = str.split('|');
        return new SaveInfo(sourceFile, note).withTime(new Date(Number.parseInt(time)));
    }
}
type SlotType = number;
export class SaveLoadManager extends Files {
    source;
    constructor(source: string) {
        super();
        this.source = source;
    }
    async getSaveFilePath(slot: SlotType) {
        return await this.getSavePath() + `/save${slot}.gal`;
    }
    async isFilled(slot: SlotType) {
        return await this.hasFile(await this.getSaveFilePath(slot));
    }
    async save(slot: SlotType, frame: Frame, note = '') {
        const str = new SaveInfo(note).toString() + '\n' + frame.toString();
        await this.writeFile(await this.getSaveFilePath(slot), str);
    }
    async getInfo(slot: SlotType) {
        if (!await this.isFilled(slot)) throw `No save data in slot ${slot}`;
        const str = await this.readFile(await this.getSaveFilePath(slot));
        return SaveInfo.fromString(splitWith('\n')(str)[0]);
    }
    async load(slot: SlotType): Promise<[lines: string[] | undefined, frame: Frame]> {
        if (!await this.isFilled(slot)) throw `No save data in slot ${slot}`;
        try {
            const str = await this.readFile(await this.getSaveFilePath(slot));
            const file = (await this.getInfo(slot)).sourceFile;
            return [
                file === this.source ? undefined : (await this.readFile(file)).split(/\r?\n/),
                Frame.fromString(splitWith('\n')(str)[1])
            ];
        }
        catch (e) {
            logger.error(e);
            error.error(e);
            throw `Cannot load from slot ${slot}: ${e}`;
        }
    }
}
