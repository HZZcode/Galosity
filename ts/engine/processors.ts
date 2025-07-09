const lodash = require('lodash');

import * as dataTypes from '../parser/data-types.js';
import * as types from "../vars/types.js";
import { logger } from "../utils/logger.js";
import { ButtonData } from "./buttons.js";
import { error, errorHandled, errorHandledAsWarning } from "./error-handler.js";
import { interpolate } from "./interpolation.js";
import { ipcRenderer, Manager } from "./manager.js";
import { TypeDispatch, DispatchFunc } from "../utils/type-dispatch.js";
import { Constructor } from '../utils/types.js';
import { KeyType } from '../utils/keybind.js';

export class Processors {
    private static dispatch = new TypeDispatch<[self: Manager], boolean, dataTypes.GalData>(false);

    private constructor() { }

    static register<T extends dataTypes.GalData>(type: Constructor<T>,
        processor: DispatchFunc<T, [self: Manager], boolean>) {
        this.dispatch.register(type, processor);
    }

    static apply(data: dataTypes.GalData, self: Manager) {
        return this.dispatch.call(data, self);
    }
}

Processors.register(dataTypes.SpeechData, (data, self) => {
    self.unsupportedForImported();
    if (data.character.trim() === '' && data.sentence.trim() === '')
        return false;
    self.texts.outputText(interpolate(data.character, self.varsFrame),
        interpolate(data.sentence, self.varsFrame));
    return true;
});
Processors.register(dataTypes.NoteData, (data, self) => {
    self.unsupportedForImported();
    self.texts.outputNote(interpolate(data.note, self.varsFrame));
    return true;
});
Processors.register(dataTypes.JumpData, (data, self) => {
    const anchor = interpolate(data.anchor, self.varsFrame);
    switch (data.type) {
        case dataTypes.JumpType.File:
            self.unsupportedForImported();
            self.jumpFile(anchor);
            break;
        case dataTypes.JumpType.Link:
            self.unsupportedForImported();
            ipcRenderer.invoke('openExternal', anchor);
            break;
        default: {
            const pos = self.paragraph.findAnchorPos(anchor);
            if (pos === -1) throw `Anchor not found: ${anchor}`;
            self.currentPos = pos - 1;
        }
    }
    return false;
});
Processors.register(dataTypes.SelectData, (_, self) => {
    self.unsupportedForImported();
    const block = self.paragraph.findStartControlBlock(self.currentPos);
    const buttons = [];
    for (const pos of block!.casesPosList) {
        const data = self.paragraph.dataList[pos] as dataTypes.CaseData;
        const show = self.varsFrame.evaluate(data.show).toBool();
        const enable = self.varsFrame.evaluate(data.enable).toBool();
        const text = interpolate(data.text, self.varsFrame);
        const callback = async () => await self.jump(self.getFrame().withPos(pos));

        if (show) buttons.push(new ButtonData(text, callback, enable));
        if (data.timeout !== undefined)
            self.timeout.set(callback, self.varsFrame.evaluate(data.timeout).toNum() * 1000);
        if (data.key !== undefined)
            self.keybind.bind(KeyType.of(interpolate(data.key, self.varsFrame)), callback);
    }
    self.buttons.drawButtons(buttons);
    return true;
});
Processors.register(dataTypes.CaseData, (data, self) => {
    if (self.paragraph.isSwitchCase(self.currentPos)) {
        const block = self.paragraph.findCaseControlBlock(self.currentPos);
        const switchData = self.paragraph.dataList[block.startPos] as dataTypes.SwitchData;
        try {
            const value = self.varsFrame.evaluate(switchData.expr);
            const matchValue = self.varsFrame.evaluate(data.text);
            const next = block.next(self.currentPos);
            if (next === undefined) throw `Case error at line ${self.currentPos}`;
            if (!self.varsFrame.equal(value, matchValue))
                self.currentPos = next;
        } catch (e) {
            logger.error(e);
            error.error(e);
        }
    }
    return false;
});
Processors.register(dataTypes.BreakData, (_, self) => {
    const casePos = self.paragraph.getCasePosAt(self.currentPos);
    const block = self.paragraph.findCaseControlBlock(casePos);
    if (block === undefined) throw `[Break] at line ${self.currentPos} is not in control block`;
    const endPos = block.endPos;
    self.currentPos = endPos;
    return false;
});
Processors.register(dataTypes.VarData, (data, self) => {
    self.varsFrame.warn = '';
    errorHandled(() => self.varsFrame.setVar(data.name, self.varsFrame.evaluate(data.expr)))();
    if (self.varsFrame.warn !== '') error.warn('Warning: ' + self.varsFrame.warn);
    return false;
});
Processors.register(dataTypes.InputData, (data, self) => {
    self.unsupportedForImported();
    self.buttons.drawInput(self.next.bind(self), expr => {
        try {
            const value = self.varsFrame.evaluate(expr);
            self.varsFrame.setVar(data.valueVar, value);
            self.varsFrame.setVar(data.errorVar, types.BoolType.ofBool(false));
        } catch (e) {
            logger.error(e);
            error.error(e);
            self.varsFrame.setVar(data.errorVar, types.BoolType.ofBool(true));
        }
    });
    return true;
});
Processors.register(dataTypes.ImageData, async (data, self) => {
    self.unsupportedForImported();
    await self.resources.check();
    const type = interpolate(data.imageType, self.varsFrame);
    const file = interpolate(data.imageFile, self.varsFrame);
    await self.resources.setImage(type, file);
    return false;
});
Processors.register(dataTypes.TransformData, (data, self) => {
    self.unsupportedForImported();
    const interpolated = lodash.cloneDeep(data);
    for (const [key, value] of Object.entries(data))
        interpolated[key] = interpolate(value, self.varsFrame);
    self.resources.transformImage(interpolated.imageType, interpolated);
    return false;
});
Processors.register(dataTypes.DelayData, (data, self) => {
    self.unsupportedForImported();
    self.timeout.set(self.next.bind(self),
        self.varsFrame.evaluate(data.seconds).toNum() * 1000, 2);
    return false;
});
Processors.register(dataTypes.PauseData, (_, __) => true);
Processors.register(dataTypes.EvalData, (data, self) => {
    const expr = interpolate(data.expr, self.varsFrame);
    errorHandledAsWarning(async () => await eval(expr))();
    return false;
});
Processors.register(dataTypes.FuncData, (_, self) => {
    self.currentPos = self.paragraph.findReturnPosAfter(self.currentPos);
    return false;
});
Processors.register(dataTypes.CallData, (data, self) => {
    self.callStack.push(self.getFrame());
    const pos = self.paragraph.findFuncPos(data.name);
    const funcData = self.paragraph.dataList[pos] as dataTypes.FuncData;
    if (funcData.args.length !== data.args.length)
        throw `Args doesn't match func ${funcData.name} at line ${self.currentPos}`;
    for (const [i, expr] of data.args.entries())
        self.varsFrame.setVar(funcData.args[i], self.varsFrame.evaluate(expr));
    self.currentPos = pos;
    return false;
});
Processors.register(dataTypes.ReturnData, (data, self) => {
    const value = data.value === '' ? new types.GalNum(0) : self.varsFrame.evaluate(data.value);
    if (self.callStack.length === 0)
        throw `Call stack is empty`;
    const frame = self.callStack.pop()!;
    self.currentPos = frame.pos;
    self.varsFrame = frame.varsFrame;
    const varName = (self.paragraph.dataList[frame.pos] as dataTypes.CallData).returnVar;
    if (varName !== undefined) self.varsFrame.setVar(varName, value);
    return false;
});
Processors.register(dataTypes.ImportData, async (data, self) => {
    // Execute this file in an no-side-effect mode
    // And read the vars and enums with these names from the sub-manager
    // If they weren't defined in this environment yet, define them; otherwise nothing is done
    // It seems to be difficult to call funcs across files 
    // So I guess we would implement this a bit later
    const content = await self.resources.readFile(data.file);
    const subManager = new Manager(false);
    await subManager.set(content.splitLine());
    for (; subManager.currentPos < subManager.paragraph.dataList.length;
        subManager.currentPos++) {
        await subManager.process(subManager.currentData());
    }
    for (const name of data.names) {
        if (self.varsFrame.isDefinedSymbol(name)) continue;
        else if (subManager.varsFrame.isDefinedVar(name))
            self.varsFrame.setVar(name, subManager.varsFrame.vars[name]);
        else if (subManager.varsFrame.isDefinedEnum(name))
            self.varsFrame.defEnumType(subManager.varsFrame.getEnumType(name)!);
        else throw `No such symbol in '${data.file}': '${name}'`;
    }
    return false;
});