const lodash = require('lodash');

import * as dataTypes from '../parser/data-types.js';
import { parseBool } from '../utils/bool.js';
import { confirm } from '../utils/confirm.js';
import { Files } from '../utils/files.js';
import { KeyType } from '../utils/keybind.js';
import { logger } from "../utils/logger.js";
import { ipcRenderer } from '../utils/runtime.js';
import type { DispatchFunc } from "../utils/type-dispatch.js";
import { TypeDispatch } from "../utils/type-dispatch.js";
import type { Constructor } from '../utils/types.js';
import * as types from "../vars/types.js";
import { ButtonData } from "./buttons.js";
import { error, errorHandled, errorHandledAsWarning } from "./error-handler.js";
import { escape, interpolate } from "./interpolation.js";
import { Manager, UnsupportedForImported } from "./manager.js";

export class Processors {
    private static dispatch = new TypeDispatch<[manager: Manager], boolean, dataTypes.GalData>(false);

    private constructor() { }

    static register<T extends dataTypes.GalData>(type: Constructor<T>,
        processor: DispatchFunc<T, [manager: Manager], boolean>) {
        this.dispatch.register(type, processor);
    }

    static apply(data: dataTypes.GalData, manager: Manager) {
        try {
            return this.dispatch.call(data, manager);
        } catch (e) {
            if (e instanceof UnsupportedForImported) {
                logger.warn(e);
                error.warn(e);
            }
            else throw e;
        }
    }
}

Processors.register(dataTypes.SpeechData, (data, manager) => {
    manager.unsupportedForImported();
    if (data.character.trim() === '' && data.sentence.trim() === '')
        return false;
    manager.texts.outputSpeech(interpolate(data.character, manager.varsFrame),
        interpolate(data.sentence, manager.varsFrame));
    return true;
});
Processors.register(dataTypes.NoteData, (data, manager) => {
    manager.unsupportedForImported();
    manager.texts.outputNote(interpolate(data.note, manager.varsFrame));
    return true;
});
Processors.register(dataTypes.JumpData, async (data, manager) => {
    const anchor = interpolate(data.anchor, manager.varsFrame);
    switch (data.type) {
        case dataTypes.JumpType.File:
            manager.unsupportedForImported();
            manager.jumpFile(anchor);
            break;
        case dataTypes.JumpType.Link:
            manager.unsupportedForImported();
            if (await confirm(`Open '${anchor}'?`))
                await ipcRenderer.invoke('openExternal', anchor);
            break;
        default: {
            const pos = manager.paragraph.findAnchorPos(anchor);
            if (pos === -1) throw new Error(`Anchor not found: ${anchor}`);
            manager.currentPos = pos - 1;
        }
    }
    return false;
});
Processors.register(dataTypes.SelectData, (_, manager) => {
    manager.unsupportedForImported();
    const block = manager.paragraph.findStartControlBlock(manager.currentPos);
    const buttons = [];
    for (const pos of block!.casesPosList) {
        const data = manager.paragraph.dataList[pos] as dataTypes.CaseData;
        const show = manager.varsFrame.evaluate(data.show).toBool();
        const enable = manager.varsFrame.evaluate(data.enable).toBool();
        const text = interpolate(data.text, manager.varsFrame);
        const callback = async () => await manager.jump(manager.getFrame().withPos(pos));

        if (show) buttons.push(new ButtonData(text, callback, enable));
        if (data.timeout !== undefined)
            manager.timeout.set(callback, manager.varsFrame.evaluate(data.timeout).toNum() * 1000);
        if (data.key !== undefined)
            manager.keybind.bind(KeyType.of(interpolate(data.key, manager.varsFrame)), callback);
    }
    manager.buttons.drawButtons(buttons);
    return true;
});
Processors.register(dataTypes.CaseData, (data, manager) => {
    if (manager.paragraph.isSwitchCase(manager.currentPos)) {
        const block = manager.paragraph.findCaseControlBlock(manager.currentPos);
        const switchData = manager.paragraph.dataList[block.startPos] as dataTypes.SwitchData;
        try {
            const value = manager.varsFrame.evaluate(switchData.expr);
            const matchValue = manager.varsFrame.evaluate(data.text);
            const next = block.next(manager.currentPos);
            if (next === undefined) throw new Error(`Case error at line ${manager.currentPos}`);
            if (manager.varsFrame.evaluateSingleBinary('!=', value, matchValue).toBool())
                manager.currentPos = next;
        } catch (e) {
            logger.error(e);
            error.error(e);
        }
    }
    return false;
});
Processors.register(dataTypes.BreakData, (_, manager) => {
    const casePos = manager.paragraph.getCasePosAt(manager.currentPos);
    const block = manager.paragraph.findCaseControlBlock(casePos);
    if (block === undefined) throw new Error(`[Break] at line ${manager.currentPos} is not in control block`);
    const endPos = block.endPos;
    manager.currentPos = endPos;
    return false;
});
Processors.register(dataTypes.VarData, (data, manager) => {
    errorHandled(() => manager.varsFrame.setVar(data.name, manager.varsFrame.evaluate(data.expr)))();
    return false;
});
Processors.register(dataTypes.InputData, (data, manager) => {
    manager.unsupportedForImported();
    manager.buttons.drawInput(manager.next.bind(manager), expr => {
        try {
            const value = manager.varsFrame.evaluate(expr);
            manager.varsFrame.setVar(data.valueVar, value);
            manager.varsFrame.setVar(data.errorVar, types.BoolType.ofBool(false));
        } catch (e) {
            logger.error(e);
            error.error(e);
            manager.varsFrame.setVar(data.errorVar, types.BoolType.ofBool(true));
        }
    });
    return true;
});
Processors.register(dataTypes.ImageData, async (data, manager) => {
    manager.unsupportedForImported();
    await manager.resources.check();
    const type = interpolate(data.imageType, manager.varsFrame);
    const file = interpolate(data.imageFile, manager.varsFrame);
    await manager.resources.setImage(type, file);
    return false;
});
Processors.register(dataTypes.TransformData, (data, manager) => {
    manager.unsupportedForImported();
    const interpolated = lodash.cloneDeep(data);
    for (const [key, value] of Object.entries(data))
        interpolated[key] = interpolate(value, manager.varsFrame);
    manager.resources.transformImage(interpolated.imageType, interpolated);
    return false;
});
Processors.register(dataTypes.DelayData, (data, manager) => {
    manager.unsupportedForImported();
    manager.timeout.set(manager.next.bind(manager),
        manager.varsFrame.evaluate(data.seconds).toNum() * 1000, 2);
    return false;
});
Processors.register(dataTypes.PauseData, () => true);
Processors.register(dataTypes.EvalData, async (data, manager) => {
    const expr = interpolate(data.expr, manager.varsFrame);
    await errorHandledAsWarning(async () => await eval(expr))();
    return false;
});
Processors.register(dataTypes.FuncData, (_, manager) => {
    manager.currentPos = manager.paragraph.findReturnPosAfter(manager.currentPos);
    return false;
});
Processors.register(dataTypes.CallData, (data, manager) => {
    manager.callStack.push(manager.getFrame());
    const pos = manager.paragraph.findFuncPos(data.name);
    const funcData = manager.paragraph.dataList[pos] as dataTypes.FuncData;
    if (funcData.args.length !== data.args.length)
        throw new Error(`Args doesn't match func ${funcData.name} at line ${manager.currentPos}`);
    for (const [i, expr] of data.args.entries())
        manager.varsFrame.setVar(funcData.args[i], manager.varsFrame.evaluate(expr));
    manager.currentPos = pos;
    return false;
});
Processors.register(dataTypes.ReturnData, (data, manager) => {
    const value = data.value === '' ? new types.GalNum(0) : manager.varsFrame.evaluate(data.value);
    if (manager.callStack.length === 0)
        throw new Error(`Call stack is empty`);
    const frame = manager.callStack.pop()!;
    manager.currentPos = frame.pos;
    manager.varsFrame = frame.varsFrame;
    const varName = (manager.paragraph.dataList[frame.pos] as dataTypes.CallData).returnVar;
    if (varName !== undefined) manager.varsFrame.setVar(varName, value);
    return false;
});
Processors.register(dataTypes.ImportData, async (data, manager) => {
    // Execute this file in an no-side-effect mode
    // And read the vars and enums with these names from the sub-manager
    // If they weren't defined in this environment yet, define them; otherwise nothing is done
    // It seems to be difficult to call funcs across files 
    // So I guess we would implement this a bit later
    const content = await new Files().readFileDecrypted(data.file);
    const subManager = new Manager(false);
    await subManager.set(content.splitLine());
    for (; subManager.currentPos < subManager.paragraph.dataList.length; subManager.currentPos++)
        await subManager.process(subManager.currentData);
    for (const name of data.names) {
        if (manager.varsFrame.isDefinedSymbol(name)) continue;
        else if (subManager.varsFrame.isDefinedVar(name))
            manager.varsFrame.setVar(name, subManager.varsFrame.vars[name]);
        else if (subManager.varsFrame.isDefinedEnum(name))
            manager.varsFrame.defEnumType(subManager.varsFrame.getEnumType(name)!);
        else throw new Error(`No such symbol in '${data.file}': '${name}'`);
    }
    return false;
});
Processors.register(dataTypes.TextData, (data, manager) => {
    manager.unsupportedForImported();
    manager.texts.outputTexts(interpolate(data.texts, manager.varsFrame));
    return true;
});
Processors.register(dataTypes.CodeData, (data, manager) => {
    manager.unsupportedForImported();
    try {
        manager.texts.outputCode(data.language, escape(data.code));
    } catch (e) {
        logger.warn(e);
        error.warn(e);
    }
    return true;
});
Processors.register(dataTypes.MediaData, async (data, manager) => {
    manager.unsupportedForImported();
    try {
        const interpolated = lodash.cloneDeep(data);
        for (const [key, value] of Object.entries(data))
            interpolated[key] = interpolate(value, manager.varsFrame);
        interpolated.block = parseBool(interpolated.block);
        interpolated.volume = parseFloat(interpolated.volume);
        interpolated.resisting = parseBool(interpolated.resisting);
        await manager.resources.playMedia(interpolated.file, interpolated);
        return interpolated.block;
    } catch (e) {
        logger.warn(e);
        error.warn(e);
    }
});