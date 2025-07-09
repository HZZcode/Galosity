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

export class ParserRegistry {
    tag;
    parser;
    colon = false;

    constructor(tag: string, parser: (part: string) => GalData) {
        this.tag = tag;
        this.parser = parser;
    }

    completeColon() {
        this.colon = true;
        return this;
    }
}

export class Parsers {
    private static parsers: ParserRegistry[] = [];

    static register(registry: ParserRegistry) {
        this.parsers.push(registry);
    }

    static parse(tag: string, nonTagPart: string) {
        const parsers = this.parsers.filter(parser => parser.tag === tag);
        return parsers.first()?.parser(nonTagPart);
    }

    static tags() {
        return this.parsers.map(parser => parser.tag);
    }

    static colonTags() {
        return this.parsers.filter(parser => parser.colon).map(parser => parser.tag);
    }
}

Parsers.register(new ParserRegistry('Character', part => new dataTypes.CharacterData(part)));
Parsers.register(new ParserRegistry('Part', part => new dataTypes.PartData(part)));
Parsers.register(new ParserRegistry('Note', part => new dataTypes.NoteData(part)));
Parsers.register(new ParserRegistry('Jump', part => new dataTypes.JumpData(part)));
Parsers.register(new ParserRegistry('Anchor', part => new dataTypes.AnchorData(part)));
Parsers.register(new ParserRegistry('Select', _ => new dataTypes.SelectData()));
Parsers.register(new ParserRegistry('Switch', part => new dataTypes.SwitchData(part)));
Parsers.register(new ParserRegistry('Case', part => {
    const [value, configs] = splitWith(':')(part);
    return new dataTypes.CaseData(value, parseConfig(configs));
}).completeColon());
Parsers.register(new ParserRegistry('Break', _ => new dataTypes.BreakData()));
Parsers.register(new ParserRegistry('End', _ => new dataTypes.EndData()));
Parsers.register(new ParserRegistry('Var', part => {
    const [name, expr] = splitWith(':')(part);
    return new dataTypes.VarData(name, expr);
}).completeColon());
Parsers.register(new ParserRegistry('Enum', part => {
    const [name, values] = splitWith(':')(part);
    return new dataTypes.EnumData(name, values.split(',').map(value => value.trim()));
}).completeColon());
Parsers.register(new ParserRegistry('Input', part => {
    const [valueVar, errorVar] = splitWith(',')(part);
    return new dataTypes.InputData(valueVar, errorVar);
}));
Parsers.register(new ParserRegistry('Image', part => {
    const [imageType, imageFile] = splitWith(':')(part);
    return new dataTypes.ImageData(imageType, imageFile);
}).completeColon());
Parsers.register(new ParserRegistry('Transform', part => {
    const [imageType, configs] = splitWith(':')(part);
    return new dataTypes.TransformData(imageType, parseConfig(configs));
}).completeColon());
Parsers.register(new ParserRegistry('Delay', part => new dataTypes.DelayData(part)));
Parsers.register(new ParserRegistry('Pause', _ => new dataTypes.PauseData()));
Parsers.register(new ParserRegistry('Eval', part => new dataTypes.EvalData(part)));
Parsers.register(new ParserRegistry('Func', part => {
    const [name, args] = parseFunc(part);
    const invalids = args.filter(arg => !string.isIdentifier(arg));
    if (invalids.length !== 0) throw `Invalid func arg: ${invalids.join(',')}`;
    return new dataTypes.FuncData(name, args);
}));
Parsers.register(new ParserRegistry('Return', part => new dataTypes.ReturnData(part)));
Parsers.register(new ParserRegistry('Call', part => {
    const [funcCall, returnVar] = part.includes(':')
        ? splitWith(':')(part) : [part, undefined];
    const [name, args] = parseFunc(funcCall);
    return new dataTypes.CallData(name, args, returnVar);
}));
Parsers.register(new ParserRegistry('Import', part => {
    const [file, names] = splitWith(':')(part);
    return new dataTypes.ImportData(file, names.split(',').map(name => name.trim()));
}).completeColon());
