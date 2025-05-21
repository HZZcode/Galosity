export class EmptyData {
    type = 'comment';
}
export class CharacterData {
    type = 'character';
    name;
    constructor(name) {
        this.name = name;
    }
}
export class SpeechData {
    type = 'sentence';
    character;
    sentence;
    constructor(character, sentence) {
        this.character = character;
        this.sentence = sentence;
    }
}
export class PartData {
    type = 'part';
    part;
    constructor(part) {
        this.part = part;
    }
}
export class NoteData {
    type = 'note';
    note;
    constructor(note) {
        this.note = note;
    }
}
export class JumpData {
    type = 'jump';
    crossFile = false;
    anchor;
    constructor(anchor) {
        if (anchor.startsWith('>')) {
            this.crossFile = true;
            this.anchor = anchor.substring(1).trim();
        }
        else this.anchor = anchor;
    }
}
export class AnchorData {
    type = 'anchor';
    anchor;
    constructor(anchor) {
        this.anchor = anchor;
    }
}
export class SelectData {
    type = 'select';
    question;
    constructor(question) {
        this.question = question;
    }
}
export class CaseData {
    type = 'case';
    text;
    constructor(text) {
        this.text = text;
    }
}
export class BreakData {
    type = 'break';
}
export class EndData {
    type = 'end';
}
export class VarData {
    type = 'var';
    name;
    expr;
    constructor(name, expr) {
        this.name = name;
        this.expr = expr;
    }
}
export class EnumData {
    type = 'enum';
    name;
    values;
    constructor(name, values) {
        this.name = name;
        this.values = values;
    }
}
export class SwitchData {
    type = 'switch';
    expr;
    constructor(expr) {
        this.expr = expr;
    }
}
export class InputData {
    type = 'input';
    valueVar;
    errorVar;
    constructor(valueVar, errorVar) {
        this.valueVar = valueVar;
        this.errorVar = errorVar;
    }
}
export class ImageData {
    type = 'image';
    imageType;
    imageFile;
    constructor(imageType, imageFile) {
        this.imageType = imageType;
        this.imageFile = imageFile;
    }
}
export class TransformData {
    type = 'transform';
    imageType;
    translateX = '0px';
    translateY = '0px';
    scaleX = 1;
    scaleY = 1;
    skewX = 0;
    skewY = 0;
    rotate = 0;
    getArgs() {
        let args = [];
        for (let key in this)
            if (key !== 'type' && key !== 'imageType')
                args.push(key);
        return args;
    }
    getAllArgs() {
        let args = [];
        for (let key of this.getArgs()) {
            args.push(key);
            if (['X', 'Y'].includes(key.at(-1)))
                args.push(key.substring(0, key.length - 1));
        }
        return [...new Set(args)].sort();
    }
    constructor(imageType, transformations) {
        this.imageType = imageType;
        if (transformations === undefined) return;
        for (let key of this.getArgs()) {
            if (key in transformations)
                this[key] = transformations[key];
            if (['X', 'Y'].includes(key.at(-1))) {
                let subKey = key.substring(0, key.length - 1);
                if (subKey in transformations)
                    this[key] = transformations[subKey];
            }
        }
    }
    toString() {
        // return `translateX(calc(${this.translateX} - 50%)) `
        return `translateX(${this.translateX}) `
            + `translateY(${this.translateY}) `
            + `scaleX(${this.scaleX}) `
            + `scaleY(${this.scaleY}) `
            + `skewX(${this.skewX}) `
            + `skewY(${this.skewY}) `
            + `rotate(${this.rotate})`;
    }
}
export class DelayData {
    type = 'delay';
    seconds = 0;
    constructor(seconds) {
        this.seconds = seconds;
    }
}
export class PauseData {
    type = 'pause';
}

function parseSpeech(line) {
    let index = line.search(':');
    return new SpeechData(line.substring(0, index), line.substring(index + 1));
}

function parseConfig(configs) {
    let object = {};
    for (let config of configs.split(',')) {
        let key = config.substring(0, config.indexOf('=')).trim();
        let value = config.substring(config.indexOf('=') + 1).trim();
        object[key] = value;
    }
    return object;
}

export function parseLine(line) {
    if (line.trim().startsWith('//')) return new EmptyData();
    if (!line.trim().startsWith('[') || line.search(']') === -1)
        return parseSpeech(line);

    let leftBracket = line.search(/\[/);
    let rightBracket = line.search(/\]/);
    let tag = line.substring(leftBracket + 1, rightBracket).trim();
    let nonTagPart = line.substring(rightBracket + 1).trim();

    let trimQuote = str => str.substring(0, str.indexOf(':'))
        + str.substring(str.indexOf(':') + 1);
    let splitWithQuote = str => [str.substring(0, str.indexOf(':')).trim(),
    str.substring(str.indexOf(':') + 1).trim()];
    let splitWithComma = str => [str.substring(0, str.indexOf(',')).trim(),
    str.substring(str.indexOf(',') + 1).trim()];

    switch (tag) {
        case 'Character': return new CharacterData(nonTagPart);
        case 'Part': return new PartData(nonTagPart);
        case 'Note': return new NoteData(nonTagPart);
        case 'Jump': return new JumpData(nonTagPart);
        case 'Anchor': return new AnchorData(nonTagPart);
        case 'Select': return new SelectData(nonTagPart);
        case 'Switch': return new SwitchData(nonTagPart);
        case 'Case': return new CaseData(trimQuote(nonTagPart).trim());
        case 'Break': return new BreakData();
        case 'End': return new EndData();
        case 'Var': {
            let [name, expr] = splitWithQuote(nonTagPart);
            return new VarData(name, expr);
        }
        case 'Enum': {
            let [name, values] = splitWithQuote(nonTagPart);
            return new EnumData(name, values.split(',').map(value => value.trim()));
        }
        case 'Input': {
            let [valueVar, errorVar] = splitWithComma(nonTagPart);
            return new InputData(valueVar, errorVar);
        }
        case 'Image': {
            let [imageType, imageFile] = splitWithQuote(nonTagPart);
            return new ImageData(imageType, imageFile);
        }
        case 'Transform': {
            let [imageType, transformationConfigs] = splitWithQuote(nonTagPart);
            let transformations = parseConfig(transformationConfigs);
            return new TransformData(imageType, transformations);
        }
        case 'Delay': {
            let seconds = Number(nonTagPart);
            if (!isNaN(seconds)) return new DelayData(seconds);
            break;
        }
        case 'Pause': return new PauseData();
    }

    return parseSpeech(line);
}

export class ControlBlock {
    startPos;
    casesPosList;
    endPos;
    constructor(startPos, casesPosList, endPos) {
        this.startPos = startPos;
        this.casesPosList = casesPosList;
        this.endPos = endPos;
    }
    next(casePos) {
        for (let [i, pos] of this.casesPosList.entries())
            if (pos === casePos)
                return i === this.casesPosList.length - 1 ? this.endPos : this.casesPosList[i + 1];
    }
}

export class Paragraph {
    dataList; //list of `LineData`s
    constructor(lines) {
        this.dataList = lines.map(parseLine);
    }
    getPartAt(pos) {
        let sub = this.dataList.slice(0, pos + 1).filter(data => data.type === 'part');
        if (sub.length === 0) return '';
        return sub.at(-1).part;
    }
    getControlBlocks() {
        let isControlTag = data => ['select', 'switch'].some(type => type === data.type);
        let ans = [];
        let stack = [];
        for (let [index, data] of this.dataList.entries()) {
            if (isControlTag(data)) stack.push(new ControlBlock(index, [], -1));
            else if (data.type === 'case') {
                if (stack.length === 0)
                    throw `Error: [Case] tag out of control block at line ${index}`;
                else {
                    stack[stack.length - 1].casesPosList.push(index);
                }
            }
            else if (data.type === 'end') {
                if (stack.length === 0)
                    throw `Error: Extra [End] found at line ${index}`;
                else {
                    let block = stack.pop();
                    block.endPos = index;
                    ans.push(block);
                }
            }
        }
        if (stack.length !== 0) throw `Error: Control Block ([Select]-[End] or [Switch]-[End]) not closed`;
        return ans;
    }
    scanEnumsAt(pos) {
        return this.dataList.slice(0, pos + 1).filter(data => data.type === 'enum');
    }
    scanEnums() {
        return this.scanEnumsAt(this.dataList.length);
    }
    scanVarsAt(pos) {
        return this.dataList.slice(0, pos + 1).filter(data => data.type === 'enum');
    }
    getCasePosAt(pos) {
        for (let i = pos; i >= 0; i--)
            if (this.dataList[i].type === 'case')
                return i;
        return -1;
    }
    getCaseType(casePos) {
        let block = this.findCaseControlBlock(casePos);
        let data = this.dataList[block.startPos];
        return data.type;
    }
    findStartControlBlock(startPos) {
        return this.getControlBlocks().find(block => block.startPos === startPos);
    }
    findCaseControlBlock(casePos) {
        return this.getControlBlocks().find(block => block.casesPosList.some(pos => pos === casePos));
    }
    findAnchorPos(anchor) {
        for (let [i, data] of this.dataList.entries())
            if (data.type === 'anchor' && data.anchor === anchor)
                return i;
        return -1;
    }
}