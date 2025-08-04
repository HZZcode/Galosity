import { splitWith } from "../utils/split.js";
import { isIdentifier } from "../utils/string.js";
import * as dataTypes from "./data-types.js";
import { GalData } from "./data-types.js";

export function parseConfig(configs: string) {
    const object: { [_: string]: any; } = {};
    for (const config of configs.split(',')) {
        if (!config.includes('=')) continue;
        const key = config.substring(0, config.indexOf('=')).trim();
        const value = config.substring(config.indexOf('=') + 1).trim();
        object[key] = value;
    }
    return object;
}

export function parseFunc(func: string): [string, string[]] {
    const left = func.search(/\(/), right = func.search(/\)/);
    if (left === -1 || right === -1) {
        const name = func.trim();
        if (!isIdentifier(name)) throw new Error(`Invalid func name: ${name}`);
        return [name, []];
    }
    const name = func.substring(0, left).trim();
    const argsPart = func.substring(left + 1, right);
    const args = argsPart.trim() === '' ? [] : argsPart.split(',').map(arg => arg.trim());
    if (!isIdentifier(name)) throw new Error(`Invalid func name: ${name}`);
    return [name, args];
} //e.g. 'f(a,b,c)' => ['f',['a','b','c']]

export class Parsers {
    private static parsers: { [tag: string]: ((part: string) => GalData) | undefined } = {};

    static register(tag: string, parser: (part: string) => GalData) {
        this.parsers[tag] = parser;
    }

    static parse(tag: string, nonTagPart: string) {
        const parsers = this.parsers[tag];
        if (parsers === undefined) return undefined;
        return parsers(nonTagPart);
    }

    static tags() {
        return Object.keys(this.parsers);
    }
}

Parsers.register('Character', part => new dataTypes.CharacterData(part));
Parsers.register('Part', part => new dataTypes.PartData(part));
Parsers.register('Note', part => new dataTypes.NoteData(part));
Parsers.register('Jump', part => new dataTypes.JumpData(part));
Parsers.register('Anchor', part => new dataTypes.AnchorData(part));
Parsers.register('Select', _ => new dataTypes.SelectData());
Parsers.register('Switch', part => new dataTypes.SwitchData(part));
Parsers.register('Case', part => {
    const [value, configs] = splitWith(':')(part);
    return new dataTypes.CaseData(value, parseConfig(configs));
});
Parsers.register('Break', _ => new dataTypes.BreakData());
Parsers.register('End', _ => new dataTypes.EndData());
Parsers.register('Var', part => {
    const [name, expr] = splitWith(':')(part);
    return new dataTypes.VarData(name, expr);
});
Parsers.register('Enum', part => {
    const [name, values] = splitWith(':')(part);
    return new dataTypes.EnumData(name, values.split(',').map(value => value.trim()));
});
Parsers.register('Input', part => {
    const [valueVar, errorVar] = splitWith(',')(part);
    return new dataTypes.InputData(valueVar, errorVar);
});
Parsers.register('Image', part => {
    const [imageType, imageFile] = splitWith(':')(part);
    return new dataTypes.ImageData(imageType, imageFile);
});
Parsers.register('Transform', part => {
    const [imageType, configs] = splitWith(':')(part);
    return new dataTypes.TransformData(imageType, parseConfig(configs));
});
Parsers.register('Delay', part => new dataTypes.DelayData(part));
Parsers.register('Pause', _ => new dataTypes.PauseData());
Parsers.register('Eval', part => new dataTypes.EvalData(part));
Parsers.register('Func', part => {
    const [name, args] = parseFunc(part);
    const invalids = args.filter(arg => !isIdentifier(arg));
    if (invalids.length !== 0) throw new Error(`Invalid func arg: ${invalids.join(',')}`);
    return new dataTypes.FuncData(name, args);
});
Parsers.register('Return', part => new dataTypes.ReturnData(part));
Parsers.register('Call', part => {
    const [funcCall, returnVar] = part.includes(':')
        ? splitWith(':')(part) : [part, undefined];
    const [name, args] = parseFunc(funcCall);
    return new dataTypes.CallData(name, args, returnVar);
});
Parsers.register('Import', part => {
    const [file, names] = splitWith(':')(part);
    return new dataTypes.ImportData(file, names.split(',').map(name => name.trim()));
});
Parsers.register('Text', part => new dataTypes.TextData(part));
Parsers.register('Code', part => {
    const [language, code] = splitWith(':')(part);
    return new dataTypes.CodeData(language, code);
});
Parsers.register('Media', part => {
    const [file, configs] = part.includes(':') ? splitWith(':')(part) : [part, ''];
    return new dataTypes.MediaData(file, parseConfig(configs));
});