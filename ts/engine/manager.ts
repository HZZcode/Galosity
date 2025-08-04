import type { GalIpcRenderer } from "../types";
const electron = require('electron');
export const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

const lodash = require('lodash');
import * as parser from '../parser/parser.js';
import * as dataTypes from '../parser/data-types.js';
import * as vars from '../vars/vars.js';
import * as types from '../vars/types.js';
import { logger } from '../utils/logger.js';
import { error } from "./error-handler.js";
import { TimeoutManager } from '../utils/timeout.js';
import { KeybindManager } from '../utils/keybind.js';
import { InfoManager, TextManager } from "./texts.js";
import { ButtonsManager } from "./buttons.js";
import { CustomData } from "./custom-data.js";
import { Frame } from "./frame.js";
import { ResourceManager } from "./resources.js";
import { getType } from "../utils/types.js";
import { part, currentLine, character, speech, texts } from "./elements.js";
import { Processors } from "./processors.js";
import { SaveLoadManager, SaveLoadScreen } from "./save-load.js";

export class UnsupportedForImported extends Error {
    constructor(pos: number, type: string) {
        super(`Operation not supported in imported files: at line ${pos}, data type is '${type}'`);
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
    texts = new TextManager(character, speech, texts);
    buttons = new ButtonsManager();
    resources = new ResourceManager();
    timeout = new TimeoutManager();
    keybind = new KeybindManager();
    SLScreen = new SaveLoadScreen();
    constructor(public isMain: boolean) {
        if (!isMain) this.info.setLine = this.info.setPart
            = this.timeout.set = this.timeout.clear = (): any => 0;
        this.varsFrame = new vars.GalVars();
        this.varsFrame.initBuiltins();
    }
    get SLManager() {
        return new SaveLoadManager(this.resources.filename!);
    }
    unsupportedForImported() {
        if (this.isMain) return;
        throw new UnsupportedForImported(this.currentPos, getType(this.currentData));
    }
    async set(lines: string[]) {
        this.paragraph = new parser.Paragraph(lines);
        this.currentPos = -1;
        await this.resources.clear();
        await this.next();
    }
    isBlocked() {
        if (this.resources.isBlocked()) return true;
        return this.currentData !== undefined
            && this.currentData instanceof dataTypes.SelectData;
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
            .then(async content => {
                await this.set(content.splitLine());
                this.resources.setFile(path);
            })
            .catch(e => {
                logger.error(e);
                error.error(e);
                throw new Error(`Cannot open file ${path}`, { cause: e });
            });
    }
    async process(data: dataTypes.GalData) {
        if (this.currentPos >= this.paragraph.dataList.length) return true;
        if (data === undefined) return false;
        if (this.buttons !== undefined) this.buttons.clear();
        this.timeout.clear();
        this.keybind.clear();
        this.setEnums();
        return await Processors.apply(data, this);
    }
    push(frame: Frame) {
        this.history.push(frame);
    }
    async previous() {
        await this.jump(this.history.pop(), false);
    }
    get currentData() {
        return this.paragraph.dataList[this.currentPos];
    }
    async next() {
        if (this.isBlocked()) return;
        if (this.currentPos >= this.paragraph.dataList.length) return;
        this.push(this.getFrame());
        this.resources.clearMediaWeak();
        do {
            this.currentPos++;
            this.info.setLine(this.currentPos);
            this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        } while (!await this.process(this.currentData));
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
        while (!await this.process(this.currentData)) this.currentPos++;
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
}

export const manager = new Manager(true);