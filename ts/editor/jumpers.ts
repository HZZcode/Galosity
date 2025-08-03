import type { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import * as dataTypes from "../parser/data-types.js";
import { parseLine } from "../parser/parser.js";
import { Constructor, Func } from "../utils/types.js";
import { file } from "./file-manager.js";
import { TextAreaManager } from "./text-manager.js";
import { scanControlBlocks } from "./elements.js";
import { confirm } from "../utils/confirm.js";

export class Jumper {
    constructor(public lineGetter: Func<[context: JumpContext], JumpResult | undefined>) { }

    static of<TData extends dataTypes.GalData = dataTypes.GalData>(type: Constructor<TData>,
        lineGetter: Func<[context: JumpContext<TData>], JumpResult | undefined>) {
        return new Jumper(context => context.data instanceof type
            ? lineGetter(context as JumpContext<TData>) : undefined);
    }

    async apply(manager: TextAreaManager): Promise<boolean> {
        const result = await this.lineGetter(new JumpContext(manager)) ?? JumpResult.fail();
        return await result.apply(manager);
    }
}

export class JumpContext<TData extends dataTypes.GalData = dataTypes.GalData> {
    lineCount;
    line;
    front;

    constructor(public manager: TextAreaManager) {
        this.lineCount = manager.currentLineCount();
        this.line = manager.currentLine();
        this.front = manager.currentLineFrontContent();
    }

    get data(): TData {
        return parseLine(this.line) as TData;
    }

    get dataList() {
        return this.manager.lines.map(parseLine);
    }
}

export class JumpResult {
    private constructor(public success: boolean, public lineCount?: number,
        public file?: string, public link?: string) { }

    static fail() {
        return new JumpResult(false);
    }

    static ofLine(lineCount?: number) {
        return new JumpResult(lineCount !== undefined, lineCount);
    }

    static ofFile(file: string) {
        return new JumpResult(true, undefined, file);
    }

    static ofLink(link: string) {
        return new JumpResult(true, undefined, undefined, link);
    }

    async apply(manager: TextAreaManager) {
        if (!this.success) return false;
        else {
            if (this.lineCount !== undefined) return manager.jumpTo(this.lineCount);
            else if (this.file !== undefined) await file.openFile(this.file);
            else if (this.link !== undefined) {
                if (await confirm(`Open '${this.link}'?`))
                    await ipcRenderer.invoke('openExternal', this.link);
            }
            else return false;
        }
        return true;
    }
}

export class Jumpers {
    private static jumpers: Jumper[] = [];

    private constructor() { }

    static register(jumper: Jumper) {
        this.jumpers.push(jumper);
    }

    static async apply(manager: TextAreaManager): Promise<boolean> {
        for (const jumper of this.jumpers)
            if (await jumper.apply(manager)) return true;
        return false;
    }
}

Jumpers.register(Jumper.of(
    dataTypes.SpeechData,
    context => context.front.includes(':') ? undefined : JumpResult.ofLine(context.dataList
        .findIndexOfType(dataTypes.CharacterData, data => data.name === context.data.character))
));
Jumpers.register(Jumper.of(
    dataTypes.JumpData,
    context => {
        const anchor = context.data.anchor;
        switch (context.data.type) {
            case dataTypes.JumpType.File: return JumpResult.ofFile(anchor);
            case dataTypes.JumpType.Link: return JumpResult.ofLink(anchor);
            default: return JumpResult.ofLine(context.dataList
                .findIndexOfType(dataTypes.AnchorData, data => data.anchor === anchor));
        }
    }
));
Jumpers.register(Jumper.of(
    dataTypes.EndData,
    context => JumpResult.ofLine(scanControlBlocks()
        .find(block => block.endPos === context.lineCount)?.startPos)
));
Jumpers.register(Jumper.of(
    dataTypes.CaseData,
    context => JumpResult.ofLine(scanControlBlocks()
        .find(block => block.casesPosList.includes(context.lineCount))?.startPos)
));
Jumpers.register(Jumper.of(
    dataTypes.CallData,
    context => JumpResult.ofLine(context.dataList
        .findIndexOfType(dataTypes.FuncData, data => data.name === context.data.name))
));
Jumpers.register(Jumper.of(
    dataTypes.ImportData,
    context => JumpResult.ofFile(context.data.file)
));