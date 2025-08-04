import { findDuplicates } from "../utils/array.js";
import { parseBool } from "../utils/bool.js";

abstract class Arg {
    constructor(public key: string, public prefixes: string[],
        public description: string = key, public defaultValue?: string) { }

    abstract parseValue(str: string): any;

    abstract get type(): string;

    get helpString() {
        return `${this.prefixes.join(', ')} (${this.type}${this.defaultValue === undefined ? ''
            : ', default=' + this.defaultValue}) - ${this.description}`;
    }
}

class BoolArg extends Arg {
    get type() {
        return 'bool';
    }

    parseValue(str: string) {
        return parseBool(str);
    }
}
class IntArg extends Arg {
    get type() {
        return 'int';
    }

    parseValue(str: string) {
        const num = parseInt(str);
        if (isNaN(num)) throw new Error(`Invalid Integer: '${str}'`);
        return num;
    }
}

class ArgParser {
    private args: Arg[] = [];
    public description = '';

    withDescription(description: string) {
        this.description = description;
        return this;
    }

    addEntry(arg: Arg) {
        this.args.push(arg);
        return this;
    }

    check() {
        const duplicates = findDuplicates(this.args.flatMap(arg => arg.prefixes));
        if (duplicates.length !== 0) throw new Error(`Duplicate Arg Prefix: ${duplicates[0]}`);
    }

    parseSingle(part: string): [key: string, value: any] | [undefined, string] {
        const index = part.indexOf('=');
        if (index === -1) return [undefined, part];
        const prefix = part.substring(0, index).trim(), str = part.substring(index + 1).trim();
        for (const arg of this.args)
            if (arg.prefixes.includes(prefix))
                return [arg.key, arg.parseValue(str)];
        throw new Error(`Invalid Prefix: '${prefix}'`);
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

    get helpString() {
        return [this.description, ...this.args.map(arg => '  ' + arg.helpString).sort()].join('\n');
    }

    printHelp() {
        // eslint-disable-next-line no-console
        console.log(this.helpString);
    }
}

// e.g. Galosity -d=true x.txt --theme=1

export const argParser = new ArgParser()
    .withDescription('Galosity [file] [prefix=value]... -- open file with arguments.\nValid arguments:')
    .addEntry(new BoolArg('files', ['-f', '--files'],
        'Enable file operations (unstable feature -- setting to false cause problems)', 'true'))
    .addEntry(new BoolArg('edit', ['-e', '--edit'],
        'When set to false, directly opens the engine through command line args', 'true'))
    .addEntry(new IntArg('autoSave', ['-a', '--auto-save'],
        'Auto save interval in seconds; when set to 0 or negative, disables auto-save.', '60'))
    .addEntry(new BoolArg('scriptTest', ['-s', '--script-test'],
        `When set to false, hide 'Current Line', 'Jump to Line' and 'Eval' functions in engine`, 'true'))
    .addEntry(new BoolArg('isDebug', ['-d', '--debug'],
        'When set to true, opens dev tools and enables logger to print in it', 'false'))
    .addEntry(new BoolArg('encrypt', ['-c', '--encrypt'], 'Encrypt the input script', 'false'))
    .addEntry(new BoolArg('help', ['-h', '--help'], 'Show this message', 'false'))
    .addEntry(new IntArg('theme', ['-t', '--theme'], 'The index of color theme', '0'));