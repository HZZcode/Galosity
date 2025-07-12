import { EventListener } from "../utils/event-listener.js";
import { Files } from "../utils/files.js";
import { KeybindManager, KeyType } from "../utils/keybind.js";
import { logger } from "../utils/logger.js";
import { splitWith } from "../utils/split.js";
import { saveLoad } from "./elements.js";
import { error, errorHandled } from "./error-handler.js";
import { Frame } from "./frame.js";
import { manager } from "./manager.js";

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
export class SaveLoadManager extends Files {
    constructor(filename: string) {
        super();
        this.filename = filename;
    }
    async getSaveFilePath(slot: number) {
        return await this.getSavePath() + `/save${slot}.gal`;
    }
    async isFilled(slot: number) {
        return await this.hasFile(await this.getSaveFilePath(slot));
    }
    async save(slot: number, frame: Frame, note = '') {
        await manager.resources.check();
        const str = new SaveInfo(manager.resources.filename!, note).toString() + '\n' + frame.toString();
        await this.writeFile(await this.getSaveFilePath(slot), str);
    }
    async getInfo(slot: number) {
        if (!await this.isFilled(slot)) throw `No save data in slot ${slot}`;
        const str = await this.readFile(await this.getSaveFilePath(slot));
        return SaveInfo.fromString(splitWith('\n')(str)[0]);
    }
    async load(slot: number): Promise<[lines: string[] | undefined, frame: Frame]> {
        if (!await this.isFilled(slot)) throw `No save data in slot ${slot}`;
        try {
            const str = await this.readFile(await this.getSaveFilePath(slot));
            const file = (await this.getInfo(slot)).sourceFile;
            return [
                file === this.filename ? undefined : (await this.readFile(file)).splitLine(),
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

export class SaveLoadScreen {
    rows = 3;
    columns = 3;
    element = saveLoad;

    start = 1;
    shown = false;

    private listeners = new EventListener(this.element);
    keybind = new KeybindManager();

    constructor() {
        this.keybind.bind(KeyType.of('Escape'), this.clear.bind(this));
    }

    async getMax() {
        let i = 1;
        while (await manager.SLManager.isFilled(i)) i++;
        return Math.min(i, this.slots);
    } // FIXME: directly check all the files

    get slots() {
        return this.rows * this.columns;
    }

    setup() {
        this.element.style.gridTemplateRows
            = `repeat(auto-fill, minmax(calc(100% / ${this.rows}), 1fr))`;
        this.element.style.gridTemplateColumns
            = `repeat(auto-fill, minmax(calc(100% / ${this.columns}), 1fr))`;
    }

    async getInfo(slot: number) {
        const info = await manager.SLManager.getInfo(slot);
        const time = info.time;
        const note = info.note;
        return time.toLocaleString() + '<br>' + note;
    }

    async createSlotElement(slot: number) {
        const button = document.createElement('button');
        const filled = await manager.SLManager.isFilled(slot);
        const info = filled ? await this.getInfo(slot) : '[Empty]';
        button.innerHTML = `slot ${slot}<br>${info}`;
        button.style.color = filled ? 'black' : 'gray';
        button.className = 'slot';
        button.addEventListener('click', async () => filled ? await this.load(slot) : this.save(slot));
        return button;
    }

    async wheel(event: WheelEvent) {
        const delta = Math.round(event.deltaY / 100);
        await this.roll(delta);
    }

    async roll(delta: number) {
        let start = this.start + delta * this.columns;
        if (start <= 0) start = 1;
        const maxStart = Math.ceil((await this.getMax() + 1) / this.columns)
            * this.columns + 1 - this.slots;
        if (start > maxStart) start = maxStart;
        this.start = start;
        await this.flush();
    }

    async show() {
        this.shown = true;
        this.setup();

        for (let i = 0; i < this.slots; i++)
            this.element.appendChild(await this.createSlotElement(i + this.start));

        this.element.style.backgroundColor = '#ffffffcc';
        this.element.style.pointerEvents = 'all';

        this.listeners.add('wheel', this.wheel.bind(this), { passive: true });
        this.listeners.add('keyup', async event => await this.keybind.apply(event));
    }

    clear() {
        this.shown = false;
        this.element.innerHTML = '';
        this.element.style.backgroundColor = 'transparent';
        this.element.style.pointerEvents = 'none';

        this.listeners.clear();
    }

    async flush() {
        this.clear();
        await this.show();
    }

    save(slot: number) {
        const input = document.createElement('input');
        input.className = 'container input save-notes';
        input.addEventListener('keyup', errorHandled(async (event) => {
            if (event.key === 'Enter') {
                const note = input.value;
                await manager.SLManager.save(slot, manager.getFrame(), note);
                this.element.removeChild(input);
                await this.flush();
            }
        }));
        this.element.appendChild(input);
    }

    async load(slot: number) {
        const [lines, frame] = await manager.SLManager.load(slot);
        if (lines !== undefined) manager.set(lines);
        manager.jump(frame, false);
    }
}