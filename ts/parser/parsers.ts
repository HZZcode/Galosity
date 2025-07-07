import { splitWith } from "../utils/split.js";
import * as string from "../utils/string.js";
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
        if (!string.isIdentifier(name)) throw `Invalid func name: ${name}`;
        return [name, []];
    }
    const name = func.substring(0, left).trim();
    const argsPart = func.substring(left + 1, right);
    const args = argsPart.trim() === '' ? [] : argsPart.split(',').map(arg => arg.trim());
    if (!string.isIdentifier(name)) throw `Invalid func name: ${name}`;
    return [name, args];
} //e.g. 'f(a,b,c)' => ['f',['a','b','c']]

export const parsers: { [tag: string]: (nonTagPart: string) => GalData } = {};

export class ParserRegistry {
    tag;
    parser;
    constructor(tag: string, parser: (nonTagPart: string) => GalData) {
        this.tag = tag;
        this.parser = parser;
    }
}

export class ParserRegister {
    private static registries: ParserRegistry[] = [];
    private static done = false;

    static add(registry: ParserRegistry) {
        this.registries.push(registry);
    }

    static register() {
        if (this.done) return;
        for (const registry of this.registries)
            parsers[registry.tag] = registry.parser;
        this.done = true;
    }
}

ParserRegister.add(new ParserRegistry('Character', nonTagPart => new dataTypes.CharacterData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Part', nonTagPart => new dataTypes.PartData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Note', nonTagPart => new dataTypes.NoteData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Jump', nonTagPart => new dataTypes.JumpData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Anchor', nonTagPart => new dataTypes.AnchorData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Select', _ => new dataTypes.SelectData()));
ParserRegister.add(new ParserRegistry('Switch', nonTagPart => new dataTypes.SwitchData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Case', nonTagPart => {
    const [value, configs] = splitWith(':')(nonTagPart);
    return new dataTypes.CaseData(value, parseConfig(configs));
}));
ParserRegister.add(new ParserRegistry('Break', _ => new dataTypes.BreakData()));
ParserRegister.add(new ParserRegistry('End', _ => new dataTypes.EndData()));
ParserRegister.add(new ParserRegistry('Var', nonTagPart => {
    const [name, expr] = splitWith(':')(nonTagPart);
    return new dataTypes.VarData(name, expr);
}));
ParserRegister.add(new ParserRegistry('Enum', nonTagPart => {
    const [name, values] = splitWith(':')(nonTagPart);
    return new dataTypes.EnumData(name, values.split(',').map(value => value.trim()));
}));
ParserRegister.add(new ParserRegistry('Input', nonTagPart => {
    const [valueVar, errorVar] = splitWith(',')(nonTagPart);
    return new dataTypes.InputData(valueVar, errorVar);
}));
ParserRegister.add(new ParserRegistry('Image', nonTagPart => {
    const [imageType, imageFile] = splitWith(':')(nonTagPart);
    return new dataTypes.ImageData(imageType, imageFile);
}));
ParserRegister.add(new ParserRegistry('Transform', nonTagPart => {
    const [imageType, configs] = splitWith(':')(nonTagPart);
    return new dataTypes.TransformData(imageType, parseConfig(configs));
}));
ParserRegister.add(new ParserRegistry('Delay', nonTagPart => new dataTypes.DelayData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Pause', _ => new dataTypes.PauseData()));
ParserRegister.add(new ParserRegistry('Eval', nonTagPart => new dataTypes.EvalData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Func', nonTagPart => {
    const [name, args] = parseFunc(nonTagPart);
    const invalids = args.filter(arg => !string.isIdentifier(arg));
    if (invalids.length !== 0) throw `Invalid func arg: ${invalids.join(',')}`;
    return new dataTypes.FuncData(name, args);
}));
ParserRegister.add(new ParserRegistry('Return', nonTagPart => new dataTypes.ReturnData(nonTagPart)));
ParserRegister.add(new ParserRegistry('Call', nonTagPart => {
    const [funcCall, returnVar] = nonTagPart.includes(':')
        ? splitWith(':')(nonTagPart) : [nonTagPart, undefined];
    const [name, args] = parseFunc(funcCall);
    return new dataTypes.CallData(name, args, returnVar);
}));
ParserRegister.add(new ParserRegistry('Import', nonTagPart => {
    const [file, names] = splitWith(':')(nonTagPart);
    return new dataTypes.ImportData(file, names.split(',').map(name => name.trim()));
}));
