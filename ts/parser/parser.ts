import * as dataTypes from './data-types.js';
import { Parsers } from './parsers.js';

function parseSpeech(line: string) {
    const index = line.search(':');
    return new dataTypes.SpeechData(line.substring(0, index), line.substring(index + 1));
}

export function parseLine(line: string): dataTypes.GalData {
    if (line.trim().startsWith('//')) return new dataTypes.EmptyData();
    if (!line.trim().startsWith('[') || line.search(']') === -1)
        return parseSpeech(line);

    const leftBracket = line.search(/\[/);
    const rightBracket = line.search(/\]/);
    const tag = line.substring(leftBracket + 1, rightBracket).trim();
    const nonTagPart = line.substring(rightBracket + 1).trim();

    const parsed = Parsers.parse(tag, nonTagPart);
    return parsed ?? parseSpeech(line);
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
    lines;
    constructor(lines: string[]) {
        this.lines = lines;
    }
    get dataList() {
        return this.lines.map(parseLine);
    }
    getPartAt(pos: number) {
        const sub = this.dataList.slice(0, pos + 1).filterType(dataTypes.PartData);
        if (sub.length === 0) return '';
        return sub.at(-1)!.part;
    }
    getControlBlocks(): ControlBlock[] {
        const isControlTag = (data: dataTypes.GalData): boolean =>
            data instanceof dataTypes.SwitchData || data instanceof dataTypes.SelectData;
        const ans = [];
        const stack = [];
        for (const [index, data] of this.dataList.entries()) {
            if (isControlTag(data)) stack.push(new ControlBlock(index, [], -1));
            else if (data instanceof dataTypes.CaseData) {
                if (stack.length === 0)
                    throw `Error: [Case] tag out of control block at line ${index}`;
                stack[stack.length - 1].casesPosList.push(index);
            }
            else if (data instanceof dataTypes.EndData) {
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
        return this.dataList.slice(0, pos + 1).filterType(dataTypes.EnumData);
    }
    scanEnums() {
        return this.scanEnumsAt(this.dataList.length);
    }
    scanVarsAt(pos: number) {
        return this.dataList.slice(0, pos + 1).filterType(dataTypes.VarData);
    }
    getCasePosAt(pos: number) {
        for (let i = pos; i >= 0; i--)
            if (this.dataList[i] instanceof dataTypes.CaseData)
                return i;
        return -1;
    }
    isSwitchCase(casePos: number) {
        const block = this.findCaseControlBlock(casePos);
        const data = this.dataList[block.startPos];
        return data instanceof dataTypes.SwitchData;
    }
    findStartControlBlock(startPos: number) {
        return this.getControlBlocks().find(block => block.startPos === startPos);
    }
    findCaseControlBlock(casePos: number) {
        return this.getControlBlocks().find(block => block.casesPosList.some(pos => pos === casePos))!;
    }
    findAnchorPos(anchor: string) {
        for (const [i, data] of this.dataList.entries())
            if (data instanceof dataTypes.AnchorData && data.anchor === anchor)
                return i;
        return -1;
    }
    findFuncPos(name: string) {
        for (const [i, data] of this.dataList.entries())
            if (data instanceof dataTypes.FuncData && data.name === name)
                return i;
        return -1;
    }
    findReturnPosAfter(pos: number) {
        for (const [i, data] of this.dataList.entries()) {
            if (i <= pos) continue;
            if (data instanceof dataTypes.ReturnData) return i;
        }
        throw `No return found after line ${pos}`;
    }
}