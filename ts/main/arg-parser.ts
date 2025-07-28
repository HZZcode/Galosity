import { findDuplicates } from "../utils/array.js";

abstract class Arg {
    constructor(public key: string, public prefixes: string[]) { }

    abstract parseValue(str: string): any;
}

class BoolArg extends Arg {
    parseValue(str: string) {
        switch (str) {
            case 'true': return true;
            case 'false': return false;
            default: throw `Invalid Boolean: '${str}'`;
        }
    }
}
class IntArg extends Arg {
    parseValue(str: string) {
        const num = parseInt(str);
        if (isNaN(num)) throw `Invalid Integer: '${str}'`;
        return num;
    }
}

class ArgParser {
    private args: Arg[] = [];

    addEntry(arg: Arg) {
        this.args.push(arg);
        return this;
    }

    check() {
        const duplicates = findDuplicates(this.args.flatMap(arg => arg.prefixes));
        if (duplicates.length !== 0) throw `Duplicate Arg Prefix: ${duplicates[0]}`;
    }

    parseSingle(part: string): [key: string, value: any] | [undefined, string] {
        const index = part.indexOf('=');
        if (index === -1) return [undefined, part];
        const prefix = part.substring(0, index).trim(), str = part.substring(index + 1).trim();
        for (const arg of this.args)
            if (arg.prefixes.includes(prefix))
                return [arg.key, arg.parseValue(str)];
        throw `Invalid Prefix: '${prefix}'`;
    }

    parseTo(parts: string[], object: { [key: string]: any }) {
        this.check();
        const rests: string[] = [];
        for (const part of parts) {
            const [key, value] = this.parseSingle(part);
            if (key === undefined) rests.push(value);
            else if (key in object) object[key] = value;
        }
        return rests;
    }
}

// e.g. Galosity -d=true x.txt --theme=1

export const argParser = new ArgParser()
    .addEntry(new BoolArg('files', ['-f', '--files']))
    .addEntry(new BoolArg('edit', ['-e', '--edit']))
    .addEntry(new BoolArg('isDebug', ['-d', '--debug']))
    .addEntry(new IntArg('theme', ['-t', '--theme']));