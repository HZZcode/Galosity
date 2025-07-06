import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

const lodash = require('lodash');
import * as parser from '../parser/parser.js';
import { splitWith } from '../utils/split.js';
import * as vars from '../vars/vars.js';
import * as types from '../vars/types.js';
import { Files } from '../utils/files.js';
import { logger } from '../utils/logger.js';
import { TimeoutManager } from '../utils/timeout.js';
import { KeybindManager } from '../utils/keybind.js';
import { bindFunction } from "../utils/bind-function.js";
import { InfoManager, TextManager } from "./texts.js";
import { ButtonsManager, ButtonData } from "./buttons.js";
import { errorHandledAsWarning, errorHandled, error } from "./error-handler.js";
import { interpolate } from "./interpolation.js";
import { CustomData } from "./custom-data.js";

const character = document.getElementById('character') as HTMLDivElement;
const speech = document.getElementById('speech') as HTMLDivElement;
const part = document.getElementById('part') as HTMLDivElement;
const jump = document.getElementById('jump') as HTMLButtonElement;
const lineInput = document.getElementById('line') as HTMLInputElement;
const currentLine = document.getElementById('current-line') as HTMLDivElement;
const evalButton = document.getElementById('eval') as HTMLButtonElement;
const codeInput = document.getElementById('code') as HTMLInputElement;

export class Frame {
    pos;
    varsFrame;
    resources; // this is in string format
    customData;
    constructor(pos: number, varsFrame: vars.GalVars, resources: string, customData: CustomData) {
        this.pos = pos;
        this.varsFrame = varsFrame;
        this.resources = resources;
        this.customData = customData;
    }

    withPos(pos: number) {
        this.pos = pos;
        return this;
    }

    toString() {
        return [this.pos, this.varsFrame, this.resources, this.customData]
            .map(data => data.toString()).join('\n');
    }

    static fromString(str: string) {
        const [pos, varsFrame, resources, customData] = str.split('\n');
        return new Frame(
            Number.parseInt(pos),
            vars.GalVars.fromString(varsFrame),
            resources,
            CustomData.fromString(customData)
        );
    }
}

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

class SaveLoadManager extends Files {
    manager;
    constructor(manager: Manager) {
        super();
        this.manager = manager;
    }
    getSourceFile() {
        return this.manager.resources.filename;
    }
    async getSaveFilePath(slot: SlotType) {
        return await this.getSavePath() + `/save${slot}.gal`;
    }
    async isFilled(slot: SlotType) {
        return await this.hasFile(await this.getSaveFilePath(slot));
    }
    async save(slot: SlotType, note = '') {
        const str = new SaveInfo(note).toString() + '\n' + this.manager.getFrame().toString();
        await this.writeFile(await this.getSaveFilePath(slot), str);
    }
    async getInfo(slot: SlotType) {
        if (!await this.isFilled(slot)) throw `No save data in slot ${slot}`;
        const str = await this.readFile(await this.getSaveFilePath(slot));
        return SaveInfo.fromString(splitWith('\n')(str)[0]);
    }
    async load(slot: SlotType) {
        if (!await this.isFilled(slot)) throw `No save data in slot ${slot}`;
        try {
            const str = await this.readFile(await this.getSaveFilePath(slot));
            const file = (await this.getInfo(slot)).sourceFile;
            if (file !== this.getSourceFile())
                await this.manager.set((await this.readFile(file)).split(/\r?\n/));
            await this.manager.jump(Frame.fromString(splitWith('\n')(str)[1]));
        }
        catch (e) {
            logger.error(e);
            error.error(e);
            throw `Cannot load from slot ${slot}: ${e}`;
        }
    }
}

class ResourceManager extends Files {
    parent = document.getElementById('images') as HTMLDivElement;
    constructor(filename = undefined) {
        super(filename);
    }
    getImageElements() {
        return [...this.parent.querySelectorAll('.image')] as HTMLDivElement[];
    }
    getElements() {
        return [...this.getImageElements(), this.getElement('background')] as HTMLDivElement[];
    }
    getElement(pos: string) {
        return document.getElementById(`${pos}-image`) as HTMLDivElement;
    }

    async clear() {
        this.getImageElements().forEach(async element => await this.setElementImage(element, 'clear'));
        await this.setImage('background', 'clear');
    }

    defImagePos(pos: string, left: string, bottom: string) {
        const id = `${pos}-image`;
        const setPos = (element: HTMLDivElement) => {
            if (left !== '') element.style.left = left;
            if (bottom !== '') element.style.bottom = bottom;
        };
        if (this.getElements().some(element => element.id === id)) {
            setPos(this.getElement(pos));
            return;
        }
        const element = document.createElement('div');
        element.className = 'image';
        element.id = id;
        setPos(element);
        this.parent.appendChild(element);
    }

    setElementBackground(element: HTMLDivElement, background: string) {
        if (element === undefined || element.style === undefined) return;
        element.style.backgroundImage = background;
    }
    async setElementImage(element: HTMLDivElement, file: string) {
        this.setElementBackground(element, file !== 'clear' ? `url("${await this.getSource(file)}")` : '');
    }
    async setImage(pos: string, file: string) {
        if (file.trim().startsWith('@')) {
            file = file.replace('@', '');
            let left = file.trim();
            let bottom = '0';
            if (file.includes(',')) {
                [left, bottom] = splitWith(',')(file);
            }
            this.defImagePos(pos, left, bottom);
        }
        else await this.setElementImage(this.getElement(pos), file);
    }

    transformElement(element: HTMLDivElement, transform: string) {
        if (element === undefined || element.style === undefined) return;
        element.style.transform = transform.toString();
    }
    transformImage(pos: string, transform: string) {
        this.transformElement(this.getElement(pos), transform);
    }

    getPos(id: string) {
        return id.endsWith('-image') ? id.slice(0, -6) : '';
    }

    toString() {
        return this.getElements().map(element => [
            this.getPos(element.id),
            element.style.left,
            element.style.bottom,
            element.style.backgroundImage,
            element.style.transform
        ].join('|')).join(';');
    }
    static fromString(str: string) {
        const manager = new ResourceManager();
        manager.clear();
        if (!str.includes(';')) return manager;
        const elements = str.split(';');
        for (const element of elements) {
            const [pos, left, bottom, image, transform] = element.split('|');
            manager.defImagePos(pos, left, bottom);
            if (image !== '') manager.setElementBackground(manager.getElement(pos), image);
            manager.transformImage(pos, transform);
        }
        return manager;
    }
}

export class Manager {
    varsFrame;
    paragraph = new parser.Paragraph([]);
    currentPos = -1;
    history: Frame[] = [];
    callStack: Frame[] = []; //frames of [Call]s
    customData = new CustomData(); //might be used by [Eval] custom data
    info = new InfoManager(part, currentLine);
    texts = new TextManager(character, speech);
    buttons = new ButtonsManager();
    resources = new ResourceManager();
    saveLoad = new SaveLoadManager(this);
    timeout = new TimeoutManager();
    keybind = new KeybindManager();
    isMain;
    constructor(isMain = true) {
        this.isMain = isMain;
        if (!isMain) this.info.setLine = this.info.setPart
            = this.timeout.set = this.timeout.clear = (): any => 0;

        this.varsFrame = new vars.GalVars();
        this.varsFrame.initBuiltins();
    }
    unsupportedForImported() {
        if (this.isMain) return;
        throw `Operation not supported in imported files: `
        + `at line ${this.currentPos}, data type is '${this.currentData().type}'`;
    }
    async set(lines: string[]) {
        this.paragraph = new parser.Paragraph(lines);
        this.currentPos = -1;
        await this.resources.clear();
        await this.next();
    }
    isSelecting() {
        const data = this.paragraph.dataList[this.currentPos];
        return data !== undefined && data.type === 'select';
    }
    setEnums() {
        for (const data of this.paragraph.scanEnumsAt(this.currentPos)) {
            const name = data.name.trim();
            const values = data.values.map(value => value.trim());
            this.varsFrame.defEnumTypeIfUnexist(new types.GalEnumType(name, values));
        }
    }
    async jumpFile(path: string) {
        path = await this.resources.getRelative(path);
        await ipcRenderer.invoke('readFile', path)
            .then(async content => await this.set(content.split(/\r?\n/)))
            .catch(e => {
                logger.error(e);
                error.error(e);
                throw `Cannot open file ${path}`;
            });
    }
    async process(data: parser.GalData) {
        if (this.currentPos >= this.paragraph.dataList.length) return true;
        if (data === undefined) return false;
        if (this.buttons !== null) this.buttons.clear();
        this.timeout.clear();
        this.keybind.clear();
        this.setEnums();
        if (data instanceof parser.SpeechData) {
            this.unsupportedForImported();
            if (data.character.trim() === '' && data.sentence.trim() === '')
                return false;
            this.texts.outputText(interpolate(data.character, this.varsFrame),
                interpolate(data.sentence, this.varsFrame));
            return true;
        }
        else if (data instanceof parser.NoteData) {
            this.unsupportedForImported();
            this.texts.outputNote(interpolate(data.note, this.varsFrame));
            return true;
        }
        else if (data instanceof parser.JumpData) {
            const anchor = interpolate(data.anchor, this.varsFrame);
            if (data.crossFile) {
                this.unsupportedForImported();
                this.jumpFile(anchor);
            }
            else if (data.href) {
                this.unsupportedForImported();
                ipcRenderer.invoke('openExternal', anchor);
            }
            else {
                const pos = this.paragraph.findAnchorPos(anchor);
                if (pos === -1) throw `Anchor not found: ${anchor}`;
                this.currentPos = pos - 1;
            }
            return false;
        }
        else if (data instanceof parser.SelectData) {
            this.unsupportedForImported();
            const block = this.paragraph.findStartControlBlock(this.currentPos);
            const buttons = [];
            for (const pos of block!.casesPosList) {
                const data = this.paragraph.dataList[pos] as parser.CaseData;
                const show = this.varsFrame.evaluate(data.show).toBool();
                const enable = this.varsFrame.evaluate(data.enable).toBool();
                const text = interpolate(data.text, this.varsFrame);
                const callback = async () => await this.jump(this.getFrame().withPos(pos));

                if (show) buttons.push(new ButtonData(text, callback, enable));
                if (data.timeout !== undefined)
                    this.timeout.set(callback, this.varsFrame.evaluate(data.timeout).toNum() * 1000);
                if (data.key !== undefined)
                    this.keybind.bind(interpolate(data.key, this.varsFrame), callback);
            }
            this.buttons.drawButtons(buttons);
            return true;
        }
        else if (data instanceof parser.CaseData) {
            if (this.paragraph.isSwitchCase(this.currentPos)) {
                const block = this.paragraph.findCaseControlBlock(this.currentPos);
                const switchData = this.paragraph.dataList[block.startPos] as parser.SwitchData;
                try {
                    const value = this.varsFrame.evaluate(switchData.expr);
                    const matchValue = this.varsFrame.evaluate(data.text);
                    const next = block.next(this.currentPos);
                    if (next === undefined) throw `Case error at line ${this.currentPos}`;
                    if (!this.varsFrame.equal(value, matchValue))
                        this.currentPos = next;
                } catch (e) {
                    logger.error(e);
                    error.error(e);
                }
            }
            return false;
        }
        else if (data instanceof parser.BreakData) {
            const casePos = this.paragraph.getCasePosAt(this.currentPos);
            const block = this.paragraph.findCaseControlBlock(casePos);
            if (block === undefined) throw `[Break] at line ${this.currentPos} is not in control block`;
            const endPos = block.endPos;
            this.currentPos = endPos;
            return false;
        }
        else if (data instanceof parser.VarData) {
            this.varsFrame.warn = '';
            errorHandled(() => this.varsFrame.setVar(data.name, this.varsFrame.evaluate(data.expr)))();
            if (this.varsFrame.warn !== '') error.warn('Warning: ' + this.varsFrame.warn);
            return false;
        }
        else if (data instanceof parser.InputData) {
            this.unsupportedForImported();
            this.buttons.drawInput(this.next.bind(this), expr => {
                try {
                    const value = this.varsFrame.evaluate(expr);
                    this.varsFrame.setVar(data.valueVar, value);
                    this.varsFrame.setVar(data.errorVar, types.BoolType.ofBool(false));
                } catch (e) {
                    logger.error(e);
                    error.error(e);
                    this.varsFrame.setVar(data.errorVar, types.BoolType.ofBool(true));
                }
            });
            return true;
        }
        else if (data instanceof parser.ImageData) {
            this.unsupportedForImported();
            await this.resources.check();
            const type = interpolate(data.imageType, this.varsFrame);
            const file = interpolate(data.imageFile, this.varsFrame);
            await this.resources.setImage(type, file);
            return false;
        }
        else if (data instanceof parser.TransformData) {
            this.unsupportedForImported();
            const interpolated = lodash.cloneDeep(data);
            for (const [key, value] of Object.entries(data))
                interpolated[key] = interpolate(value, this.varsFrame);
            this.resources.transformImage(interpolated.imageType, interpolated);
            return false;
        }
        else if (data instanceof parser.DelayData) {
            this.unsupportedForImported();
            this.timeout.set(this.next.bind(this),
                this.varsFrame.evaluate(data.seconds).toNum() * 1000, 2);
            return false;
        }
        else if (data instanceof parser.PauseData) return true;
        else if (data instanceof parser.EvalData) {
            const expr = interpolate(data.expr, this.varsFrame);
            errorHandledAsWarning(async () => await eval(expr))();
            return false;
        }
        else if (data instanceof parser.FuncData) {
            this.currentPos = this.paragraph.findReturnPosAfter(this.currentPos);
            return false;
        }
        else if (data instanceof parser.CallData) {
            this.callStack.push(this.getFrame());
            const pos = this.paragraph.findFuncPos(data.name);
            const funcData = this.paragraph.dataList[pos] as parser.FuncData;
            if (funcData.args.length !== data.args.length)
                throw `Args doesn't match func ${funcData.name} at line ${this.currentPos}`;
            for (const [i, expr] of data.args.entries())
                this.varsFrame.setVar(funcData.args[i], this.varsFrame.evaluate(expr));
            this.currentPos = pos;
            return false;
        }
        else if (data instanceof parser.ReturnData) {
            const value = data.value === '' ? new types.GalNum(0) : this.varsFrame.evaluate(data.value);
            if (this.callStack.length === 0)
                throw `Call stack is empty`;
            const frame = this.callStack.pop()!;
            this.currentPos = frame.pos;
            this.varsFrame = frame.varsFrame;
            const varName = (this.paragraph.dataList[frame.pos] as parser.CallData).returnVar;
            if (varName !== undefined) this.varsFrame.setVar(varName, value);
            return false;
        }
        else if (data instanceof parser.ImportData) {
            // Execute this file in an no-side-effect mode
            // And read the vars and enums with these names from the sub-manager
            // If they weren't defined in this environment yet, define them; otherwise nothing is done
            // It seems to be difficult to call funcs across files 
            // So I guess we would implement this a bit later
            const content = await this.resources.readFile(data.file);
            const subManager = new Manager(false);
            await subManager.set(content.split(/\r?\n/));
            for (; subManager.currentPos < subManager.paragraph.dataList.length;
                subManager.currentPos++) {
                await subManager.process(subManager.currentData());
            }
            for (const name of data.names) {
                if (this.varsFrame.isDefinedSymbol(name)) continue;
                else if (subManager.varsFrame.isDefinedVar(name))
                    this.varsFrame.setVar(name, subManager.varsFrame.vars[name]);
                else if (subManager.varsFrame.isDefinedEnum(name))
                    this.varsFrame.defEnumType(subManager.varsFrame.getEnumType(name)!);
                else throw `No such symbol in '${data.file}': '${name}'`;
            }
            return false;
        }
        return false;
    }
    push(frame: Frame) {
        this.history.push(frame);
    }
    async previous() {
        await this.jump(this.history.pop(), false);
    }
    currentData() {
        return this.paragraph.dataList[this.currentPos];
    }
    async next() {
        if (this.isSelecting()) return;
        if (this.currentPos >= this.paragraph.dataList.length) return;
        this.push(this.getFrame());
        do {
            this.currentPos++;
            this.info.setLine(this.currentPos);
            this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        } while (!await this.process(this.currentData()));
    }
    async jump(frame?: number | Frame, memorize = true) {
        if (frame === undefined) return;
        if (memorize) this.push(this.getFrame());
        if (typeof frame === 'number') {
            this.currentPos = frame;
        }
        else {
            this.currentPos = frame.pos;
            if (frame.varsFrame !== undefined) this.varsFrame = frame.varsFrame;
            if (frame.resources !== undefined)
                this.resources = ResourceManager.fromString(frame.resources);
            if (frame.customData !== undefined) this.customData = frame.customData;
        }
        this.info.setLine(this.currentPos);
        this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        while (!await this.process(this.paragraph.dataList[this.currentPos])) this.currentPos++;
    } // DO NOT call `jump` directly in `process`!!!
    async eval(line: string) {
        await this.process(parser.parseLine(line));
    }
    getFrame() {
        return new Frame(
            this.currentPos,
            this.varsFrame.copy(),
            this.resources.toString(),
            lodash.clone(this.customData)
        );
    }
    save() {
        // Here we need some GUI but I don't know how should it be yet
        // After that we simply get a slot and some optional notes
        // Then use `this.saveLoad.save(slot, note)`
    }
    load() {
        // Similar to `save()`. with `this.saveLoad.load(slot)`.
        // I just hate designing GUI.
    }
}

const manager = new Manager();

const initPromise = new Promise<void>((resolve, reject) => {
    ipcRenderer.on('test-data', async (_, data) => {
        try {
            await manager.set(data.content.split(/\r?\n/));
            manager.resources.filename = data.filename;
            logger.isDebug = data.isDebug;
            resolve();
        } catch (e) {
            logger.error(e);
            error.error(e);
            reject(e);
        }
    });
});

function isNum(value: string) {
    return Number.isFinite(Number(value)) && value !== '';
}

async function main() {
    await initPromise;

    window.addEventListener('keydown', errorHandled(async event => {
        if ((event.target as HTMLElement).tagName.toLowerCase() === 'input') return;
        const key = event.key;
        if (key === 'Backspace') await manager.previous();
        else if (key === 'Enter') await manager.next();
        manager.keybind.check(event);
        // else if (event.ctrlKey && key.toLowerCase() === 's') await manager.save();
        // else if (event.ctrlKey && key.toLowerCase() === 'l') await manager.load();
    }));

    bindFunction('previous', manager.previous.bind(manager));
    bindFunction('next', manager.next.bind(manager));

    const bindInput = (button: HTMLButtonElement, input: HTMLInputElement,
        func: (() => void) | (() => Promise<void>)) => {
        button.addEventListener('click', errorHandled(func));
        input.addEventListener('keyup', errorHandled(async event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await func();
            }
        }));
    };

    bindInput(jump, lineInput, async () => {
        const index = lineInput.value;
        if (isNum(index)) await manager.jump(Number.parseInt(index));
    });

    bindInput(evalButton, codeInput, async () => {
        const code = codeInput.value;
        await manager.eval(code);
    });
}
// TODO: Tip before jumping
// TODO: save & load
// TODO: search & replace
// TODO: import funcs

// eslint-disable-next-line floatingPromise/no-floating-promise
main();