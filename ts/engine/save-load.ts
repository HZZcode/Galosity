import { AutoBind } from "../utils/auto-bind.js";
import { confirm } from "../utils/confirm.js";
import { WrapError } from "../utils/errors.js";
import { HandleError } from "../utils/errors.js";
import { EventListener } from "../utils/event-listener.js";
import { Files } from "../utils/files.js";
import { KeybindManager, KeyType } from "../utils/keybind.js";
import { Runtime } from "../utils/runtime.js";
import { splitWith } from "../utils/split.js";
import { Frame } from "./frame.js";
import { manager } from "./manager.js";

class SaveInfo {
    time;
    note;
    constructor(public sourceFile: string, note: string) {
        this.time = new Date();
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
        return new SaveInfo(sourceFile, note).withTime(new Date(parseInt(time)));
    }
}

type LoadResult = [lines: string[] | undefined, frame: Frame];

export abstract class SaveLoad<Id> extends Files {
    abstract idToFilename(id: Id): string;
    async getSaveFilePath(id: Id) {
        return await this.resolve(this.idToFilename(id), await this.getSavePath());
    }
    async isFilled(id: Id) {
        return await this.hasFile(await this.getSaveFilePath(id));
    }
    async checkFilled(id: Id) {
        const filename = await this.getSaveFilePath(id);
        if (!await this.isFilled(id)) throw new Error(`No save data in ${filename}`);
    }
    async getSaveFiles() {
        return await Runtime.api.invoke('readdir', await this.getSavePath());
    }
    async save(id: Id, frame: Frame, note: string) {
        const filename = await this.getSaveFilePath(id);
        await manager.resources.check();
        const content = new SaveInfo(manager.resources.filename!, note).toString() + '\n' + frame.toString();
        await this.writeFileEncrypted(filename, content);
    }
    async getInfo(id: Id) {
        const filename = await this.getSaveFilePath(id);
        this.checkFilled(id);
        const content = await this.readFileDecrypted(filename);
        return SaveInfo.fromString(splitWith('\n')(content)[0]);
    }
    @WrapError('Cannot load from file')
    async load(id: Id): Promise<LoadResult> {
        const filename = await this.getSaveFilePath(id);
        this.checkFilled(id);
        const content = await this.readFileDecrypted(filename);
        const file = (await this.getInfo(id)).sourceFile;
        return [
            file === this.filename ? undefined : (await this.readFileDecrypted(file)).splitLine(),
            Frame.fromString(splitWith('\n')(content)[1])
        ];
    }
    async deleteSave(id: Id) {
        const filename = await this.getSaveFilePath(id);
        await this.delete(filename);
    }
}

export class SaveLoadManager extends SaveLoad<number> {
    override idToFilename(slot: number) {
        return `save${slot}.gal`;
    }
    async maxSlot() {
        return Math.max(0, ...(await this.getSaveFiles()).map(file =>
            parseInt(/save(\d+)\.gal/.exec(file)?.[1] ?? '0')));
    }
}

@AutoBind
export class SaveLoadScreen {
    rows = 3;
    columns = 3;
    element = document.getElementById('save-load') as HTMLDivElement;

    start = 1;
    shown = false;

    private listeners = new EventListener(this.element);
    keybind = new KeybindManager();

    constructor() {
        this.keybind.bind(KeyType.of('Escape'), this.clear);
    }

    async getMax() {
        return Math.max(await manager.SLManager.maxSlot(), this.slots);
    }

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
        button.style.color = filled ? 'var(--color)' : 'var(--color-3)';
        button.className = 'button slot';
        button.addEventListener('mouseup', async event => {
            if (event.button === 0) {
                if (filled) await this.load(slot);
                else this.save(slot);
            }
            else {
                if (!filled) return;
                await this.delete(slot);
                event.preventDefault();
            }
        });
        return button;
    }

    async wheel(event: WheelEvent) {
        const delta = Math.round(event.deltaY / 100);
        await this.roll(delta);
    }

    async roll(delta: number) {
        const previous = this.start;
        let start = this.start + delta * this.columns;
        if (start <= 0) start = 1;
        const maxStart = Math.ceil((await this.getMax() + 1) / this.columns)
            * this.columns + 1 - this.slots;
        if (start > maxStart) start = maxStart;
        this.start = start;
        if (this.start !== previous) await this.flush();
    }

    async show() {
        this.shown = true;
        this.setup();

        for (let i = 0; i < this.slots; i++)
            this.element.appendChild(await this.createSlotElement(i + this.start));

        this.element.style.backgroundColor = 'var(--color-alpha-1)';
        this.element.style.pointerEvents = 'all';

        this.listeners.add('wheel', this.wheel, { passive: true });
        this.listeners.add('keyup', this.keybind.apply);
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
        input.addEventListener('keyup', HandleError(async event => {
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
        if (await confirm(`Load save file at slot ${slot}?`)) {
            const [lines, frame] = await manager.SLManager.load(slot);
            if (lines !== undefined) manager.set(lines);
            manager.jump(frame, false);
            this.clear();
        }
    }

    async delete(slot: number) {
        if (await confirm(`Delete save file at slot ${slot}?`)) {
            await manager.SLManager.deleteSave(slot);
            await this.flush();
        }
    }
}