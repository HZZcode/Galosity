import { GalIpcRenderer } from "../types";
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
import { SaveLoadManager } from "./save-load.js";
import { getType } from "../utils/types.js";
import { part, currentLine, character, speech } from "./elements.js";
import { processor, ProcessorRegister } from "./processors.js";

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
    saveLoad = new SaveLoadManager(this.resources.filename!);
    timeout = new TimeoutManager();
    keybind = new KeybindManager();
    isMain;
    constructor(isMain: boolean) {
        this.isMain = isMain;
        if (!isMain) this.info.setLine = this.info.setPart
            = this.timeout.set = this.timeout.clear = (): any => 0;

        ProcessorRegister.register();

        this.varsFrame = new vars.GalVars();
        this.varsFrame.initBuiltins();
    }
    unsupportedForImported() {
        if (this.isMain) return;
        throw `Operation not supported in imported files: `
        + `at line ${this.currentPos}, data type is '${getType(this.currentData())}'`;
    }
    async set(lines: string[]) {
        this.paragraph = new parser.Paragraph(lines);
        this.currentPos = -1;
        await this.resources.clear();
        await this.next();
    }
    isSelecting() {
        const data = this.paragraph.dataList[this.currentPos];
        return data !== undefined && data instanceof dataTypes.SelectData;
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
            .then(async content => await this.set(content.splitLine()))
            .catch(e => {
                logger.error(e);
                error.error(e);
                throw `Cannot open file ${path}`;
            });
    }
    async process(data: dataTypes.GalData) {
        if (this.currentPos >= this.paragraph.dataList.length) return true;
        if (data === undefined) return false;
        if (this.buttons !== undefined) this.buttons.clear();
        this.timeout.clear();
        this.keybind.clear();
        this.setEnums();
        return await processor.call(data, this);
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
        // Then use `this.saveLoad.save(slot, this.getFrame(), note)`
    }
    load() {
        // Similar to `save()`.
        // Get `lines` and `frame` with `this.saveLoad.load(slot)`, and `set(lines)` and `jump(frame)`.
        // I just hate designing GUI.
    }
}