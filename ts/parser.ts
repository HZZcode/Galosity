import * as vars from './vars.js';
import { splitWith } from './split.js';

export class GalData {
    type;
    constructor(type: string) {
        this.type = type;
    }
}
export class EmptyData extends GalData {
    constructor() {
        super('comment');
    }
}
export class CharacterData extends GalData {
    name;
    constructor(name: string) {
        super('character');
        this.name = name;
    }
}
export class SpeechData extends GalData {
    character;
    sentence;
    constructor(character: string, sentence: string) {
        super('sentence');
        this.character = character;
        this.sentence = sentence;
    }
}
export class PartData extends GalData {
    part;
    constructor(part: string) {
        super('part');
        this.part = part;
    }
}
export class NoteData extends GalData {
    note;
    constructor(note: string) {
        super('note');
        this.note = note;
    }
}
export class JumpData extends GalData {
    href = false;
    crossFile = false;
    anchor;
    constructor(anchor: string) {
        super('jump');
        if (anchor.startsWith('%')) {
            this.href = true;
            this.anchor = anchor.substring(1).trim();
        }
        else if (anchor.startsWith('>')) {
            this.crossFile = true;
            this.anchor = anchor.substring(1).trim();
        }
        else this.anchor = anchor;
    }
}
export class AnchorData extends GalData {
    anchor;
    constructor(anchor: string) {
        super('anchor');
        this.anchor = anchor;
    }
}
export class SelectData extends GalData {
    constructor() {
        super('select');
    }
}
export class CaseData extends GalData {
    text;
    show = 'true';   // Whether the player can see this choice
    enable = 'true'; // Whether the player can select this choice
    key?: string;      // This case can be chosen with a key
    timeout?: string;  // After how many seconds will the choice be directly chosen.
    // Note that arguments `timeout` and `key` are secretly undocumented.
    // They apply even if the choice is neither shown nor enabled.

    getArgs(): (keyof this & string)[] {
        return Object.keys(this).filter(key => key !== 'text') as (keyof this & string)[];
    }
    getPublicArgs() {
        return this.getArgs().filter(key => !['key', 'timeout'].includes(key));
    }
    constructor(text: string, config: { [_: string]: any }) {
        super('case');
        this.text = text;
        for (const key of this.getArgs())
            if (key in config) this[key] = config[key].trim();
    }
}
export class BreakData extends GalData {
    constructor() {
        super('break');
    }
}
export class EndData extends GalData {
    constructor() {
        super('end');
    }
}
export class VarData extends GalData {
    name;
    expr;
    constructor(name: string, expr: string) {
        super('var');
        this.name = name;
        this.expr = expr;
    }
}
export class EnumData extends GalData {
    name;
    values;
    constructor(name: string, values: string[]) {
        super('enum');
        this.name = name;
        this.values = values;
    }
}
export class SwitchData extends GalData {
    expr;
    constructor(expr: string) {
        super('switch');
        this.expr = expr;
    }
}
export class InputData extends GalData {
    valueVar;
    errorVar;
    constructor(valueVar: string, errorVar: string) {
        super('input');
        this.valueVar = valueVar;
        this.errorVar = errorVar;
    }
}
export class ImageData extends GalData {
    imageType;
    imageFile;
    constructor(imageType: string, imageFile: string) {
        super('image');
        this.imageType = imageType;
        this.imageFile = imageFile;
    }
}
export class TransformData extends GalData {
    imageType;
    translateX = '0px';
    translateY = '0px';
    scaleX = 1;
    scaleY = 1;
    skewX = 0;
    skewY = 0;
    rotate = 0;
    getArgs(): (keyof this & string)[] {
        return Object.keys(this).filter(key => !['type', 'imageType']
            .includes(key)) as (keyof this & string)[];
    }
    getAllArgs() {
        return [...new Set(
            this.getArgs().flatMap(key => ['X', 'Y'].includes(key.at(-1)!)
                ? [key] : [key, key.slice(0, -1)])
        )].sort();
    }
    constructor(imageType: string, transformations: { [_: string]: any }) {
        super('transform');
        this.imageType = imageType;
        if (transformations === undefined) return;
        for (const key of this.getArgs()) {
            if (key in transformations)
                this[key] = transformations[key];
            if (['X', 'Y'].includes(key.at(-1)!)) {
                const subKey = key.substring(0, key.length - 1);
                if (subKey in transformations)
                    this[key] = transformations[subKey];
            }
        }
    }
    toString() {
        return this.getArgs().map(arg => `${arg}(${this[arg]})`).map(s => s.replace(' ', '')).join(' ');
    }
}
export class DelayData extends GalData {
    seconds = '0';
    constructor(seconds: string) {
        super('delay');
        this.seconds = seconds;
    }
}
export class PauseData extends GalData {
    constructor() {
        super('pause');
    }
}
export class EvalData extends GalData {
    expr;
    constructor(expr: string) {
        super('eval');
        this.expr = expr;
    }
}
export class FuncData extends GalData {
    name;
    args;
    constructor(name: string, args: string[]) {
        super('func');
        this.name = name;
        this.args = args;
    }
}
export class ReturnData extends GalData {
    value;
    constructor(value: string) {
        super('return');
        this.value = value;
    }
}
export class CallData extends GalData {
    name;
    args;
    returnVar;
    constructor(name: string, args: string[], returnVar?: string) {
        super('call');
        this.name = name;
        this.args = args;
        this.returnVar = returnVar;
    }
}
export class ImportData extends GalData {
    file;
    names;
    constructor(file: string, names: string[]) {
        super('import');
        this.file = file;
        this.names = names;
    }
}

function parseSpeech(line: string) {
    const index = line.search(':');
    return new SpeechData(line.substring(0, index), line.substring(index + 1));
}

function parseConfig(configs: string) {
    const object: { [_: string]: any } = {};
    for (const config of configs.split(',')) {
        if (!config.includes('=')) continue;
        const key = config.substring(0, config.indexOf('=')).trim();
        const value = config.substring(config.indexOf('=') + 1).trim();
        object[key] = value;
    }
    return object;
}

function parseFunc(func: string): [string, string[]] {
    const left = func.search(/\(/), right = func.search(/\)/);
    if (left === -1 || right === -1) {
        const name = func.trim();
        if (!vars.isIdentifier(name)) throw `Invalid func name: ${name}`;
        return [name, []];
    }
    const name = func.substring(0, left).trim();
    const argsPart = func.substring(left + 1, right);
    const args = argsPart.trim() === '' ? [] : argsPart.split(',').map(arg => arg.trim());
    if (!vars.isIdentifier(name)) throw `Invalid func name: ${name}`;
    return [name, args];
} //e.g. 'f(a,b,c)' => ['f',['a','b','c']]

export function parseLine(line: string): GalData {
    if (line.trim().startsWith('//')) return new EmptyData();
    if (!line.trim().startsWith('[') || line.search(']') === -1)
        return parseSpeech(line);

    const leftBracket = line.search(/\[/);
    const rightBracket = line.search(/\]/);
    const tag = line.substring(leftBracket + 1, rightBracket).trim();
    const nonTagPart = line.substring(rightBracket + 1).trim();

    switch (tag) {
        case 'Character': return new CharacterData(nonTagPart);
        case 'Part': return new PartData(nonTagPart);
        case 'Note': return new NoteData(nonTagPart);
        case 'Jump': return new JumpData(nonTagPart);
        case 'Anchor': return new AnchorData(nonTagPart);
        case 'Select': return new SelectData();
        case 'Switch': return new SwitchData(nonTagPart);
        case 'Case': {
            const [value, configs] = splitWith(':')(nonTagPart);
            return new CaseData(value, parseConfig(configs));
        }
        case 'Break': return new BreakData();
        case 'End': return new EndData();
        case 'Var': {
            const [name, expr] = splitWith(':')(nonTagPart);
            return new VarData(name, expr);
        }
        case 'Enum': {
            const [name, values] = splitWith(':')(nonTagPart);
            return new EnumData(name, values.split(',').map(value => value.trim()));
        }
        case 'Input': {
            const [valueVar, errorVar] = splitWith(',')(nonTagPart);
            return new InputData(valueVar, errorVar);
        }
        case 'Image': {
            const [imageType, imageFile] = splitWith(':')(nonTagPart);
            return new ImageData(imageType, imageFile);
        }
        case 'Transform': {
            const [imageType, configs] = splitWith(':')(nonTagPart);
            return new TransformData(imageType, parseConfig(configs));
        }
        case 'Delay': return new DelayData(nonTagPart);
        case 'Pause': return new PauseData();
        case 'Eval': return new EvalData(nonTagPart);
        case 'Func': {
            const [name, args] = parseFunc(nonTagPart);
            const invalids = args.filter(arg => !vars.isIdentifier(arg));
            if (invalids.length !== 0) throw `Invalid func arg: ${invalids.join(',')}`;
            return new FuncData(name, args);
        }
        case 'Return': return new ReturnData(nonTagPart);
        case 'Call': {
            const [funcCall, returnVar] = nonTagPart.includes(':')
                ? splitWith(':')(nonTagPart) : [nonTagPart, undefined];
            const [name, args] = parseFunc(funcCall);
            return new CallData(name, args, returnVar);
        }
        case 'Import': {
            const [file, names] = splitWith(':')(nonTagPart);
            return new ImportData(file, names.split(',').map(name => name.trim()));
        }
    }

    return parseSpeech(line);
}

export class ControlBlock {
    startPos;
    casesPosList;
    endPos;
    constructor(startPos: number, casesPosList: number[], endPos: number) {
        this.startPos = startPos;
        this.casesPosList = casesPosList;
        this.endPos = endPos;
    }
    next(casePos: number) {
        for (const [i, pos] of this.casesPosList.entries())
            if (pos === casePos)
                return i === this.casesPosList.length - 1 ? this.endPos : this.casesPosList[i + 1];
    }
}

export class Paragraph {
    dataList;
    constructor(lines: string[]) {
        this.dataList = lines.map(parseLine);
    }
    getPartAt(pos: number) {
        const sub = this.dataList.slice(0, pos + 1)
            .filter(data => data instanceof PartData);
        if (sub.length === 0) return '';
        return sub.at(-1)!.part;
    }
    getControlBlocks(): ControlBlock[] {
        const isControlTag = (data: GalData): boolean => 
            data instanceof SwitchData || data instanceof SelectData;
        const ans = [];
        const stack = [];
        for (const [index, data] of this.dataList.entries()) {
            if (isControlTag(data)) stack.push(new ControlBlock(index, [], -1));
            else if (data instanceof CaseData) {
                if (stack.length === 0)
                    throw `Error: [Case] tag out of control block at line ${index}`;
                stack[stack.length - 1].casesPosList.push(index);
            }
            else if (data instanceof EndData) {
                if (stack.length === 0)
                    throw `Error: Extra [End] found at line ${index}`;
                const block = stack.pop()!;
                block.endPos = index;
                ans.push(block);
            }
        }
        if (stack.length !== 0)
            throw `Error: Control block ([Select]-[End] or [Switch]-[End]) not closed`;
        return ans;
    }
    scanEnumsAt(pos: number) {
        return this.dataList.slice(0, pos + 1).filter(data => data instanceof EnumData);
    }
    scanEnums() {
        return this.scanEnumsAt(this.dataList.length);
    }
    scanVarsAt(pos: number) {
        return this.dataList.slice(0, pos + 1).filter(data => data instanceof VarData);
    }
    getCasePosAt(pos: number) {
        for (let i = pos; i >= 0; i--)
            if (this.dataList[i] instanceof CaseData)
                return i;
        return -1;
    }
    isSwitchCase(casePos: number) {
        const block = this.findCaseControlBlock(casePos);
        const data = this.dataList[block.startPos];
        return data instanceof SwitchData;
    }
    findStartControlBlock(startPos: number) {
        return this.getControlBlocks().find(block => block.startPos === startPos);
    }
    findCaseControlBlock(casePos: number) {
        return this.getControlBlocks().find(block => block.casesPosList.some(pos => pos === casePos))!;
    }
    findAnchorPos(anchor: string) {
        for (const [i, data] of this.dataList.entries())
            if (data instanceof AnchorData && data.anchor === anchor)
                return i;
        return -1;
    }
    findFuncPos(name: string) {
        for (const [i, data] of this.dataList.entries())
            if (data instanceof FuncData && data.name === name)
                return i;
        return -1;
    }
    findReturnPosAfter(pos: number) {
        for (const [i, data] of this.dataList.entries()) {
            if (i <= pos) continue;
            if (data instanceof ReturnData) return i;
        }
        throw `No return found after line ${pos}`;
    }
}