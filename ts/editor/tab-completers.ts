import * as dataTypes from "../parser/data-types.js";
import { Paragraph, parseLine } from "../parser/parser.js";
import { isInterpolate } from "../utils/split.js";
import { Func } from "../utils/types.js";
import { GalVars } from "../vars/vars.js";
import { AutoComplete, FileComplete } from "./completer.js";
import { file } from "./file-manager.js";
import { TextAreaManager } from "./text-manager.js";

export class TabCompleteContext {
    manager;
    front;
    back;
    line;

    constructor(manager: TextAreaManager) {
        this.manager = manager;
        this.front = manager.currentLineFrontContent();
        this.back = manager.currentLineBackContent();
        this.line = manager.currentLine();
    }

    get data() {
        return parseLine(this.line);
    }

    get dataList() {
        return this.manager.lines.map(parseLine);
    }
}

export class TabCompleter {
    complete;
    predicate;
    partGetter;
    scanner;

    constructor(complete: AutoComplete,
        predicate: (context: TabCompleteContext) => boolean,
        partGetter: (context: TabCompleteContext) => string,
        scanner?: Func<[context: TabCompleteContext], string[]>) {
        this.complete = complete;
        this.predicate = predicate;
        this.partGetter = partGetter;
        this.scanner = scanner;
    }

    static ofCombined(complete: AutoComplete,
        predicateAndPartGetter: (context: TabCompleteContext) => string | undefined,
        scanner?: Func<[context: TabCompleteContext], string[]>) {
        return new TabCompleter(
            complete,
            context => predicateAndPartGetter(context) !== undefined,
            context => predicateAndPartGetter(context)!,
            scanner
        );
    }

    async apply(manager: TextAreaManager): Promise<boolean> {
        const context = new TabCompleteContext(manager);
        if (!this.predicate(context)) return false;
        if (this.scanner !== undefined)
            this.complete.setList(await this.scanner(context));
        const part = this.partGetter(context).trim();
        const word = await this.complete.completeInclude(part);
        if (word === undefined) return false;
        manager.complete(word, part);
        return true;
    }
}

export class TabCompleters {
    private static completers: TabCompleter[] = [];

    private constructor() { }

    static register(completer: TabCompleter) {
        this.completers.push(completer);
    }

    static async apply(manager: TextAreaManager) {
        for (const completer of this.completers)
            if (await completer.apply(manager)) return true;
        return false;
    }
}

const tags = [
    '[Character]', '[Part]', '[Note]',
    '[Jump]', '[Anchor]',
    '[Select]', '[Case]', '[Break]', '[End]',
    '[Var]', '[Enum]', '[Switch]',
    '[Input]', '[Delay]', '[Pause]', '[Eval]',
    '[Image]', '[Transform]',
    '[Func]', '[Return]', '[Call]',
    '[Import]'
];
const colonTags = ['[Case]', '[Var]', '[Enum]', '[Image]', '[Transform]', '[Import]'];
const imageTypes = ['background', 'left', 'center', 'right'];
const transformTypes = new dataTypes.TransformData('').getAllArgs();

const isConfigKey = (front: string) => front.replaceAll(/=.*?,/g, '').includes('=');
const getConfigKey = (front: string) => front.substring(Math.max(front.indexOf(':'),
    front.lastIndexOf(',')) + 1).replace(/\[.*?\]/, '').trim();

function scanSymbols(dataList: dataTypes.GalData[]) {
    const frame = new GalVars();
    frame.initBuiltins();
    const enums = dataList.filterType(dataTypes.EnumData);

    return [... new Set([
        ...dataList.filterType(dataTypes.VarData).map(data => data.name),
        ...enums.map(data => data.name),
        ...enums.map(data => data.values).flat(),
        ...dataList.filterType(dataTypes.ImportData).map(data => data.names).flat(),
        ...Object.keys(frame.builtins),
        ...Object.keys(frame.builtinFuncs)
    ])].filter(symbol => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbol));
}

TabCompleters.register(new TabCompleter(
    new AutoComplete(tags.map(tag => colonTags.includes(tag) ? (tag + ':') : tag)),
    context => context.front.trim().startsWith('[')
        && (!context.front.includes(']') || context.front.trim().endsWith(']')),
    context => context.front,
)); // Tags
TabCompleters.register(new TabCompleter(
    new AutoComplete(),
    context => !context.front.includes('[')
        && (!context.front.includes(':') || context.front.search(':') === context.front.length - 1),
    context => context.front.replace(':', ''),
    context => context.dataList.filterType(dataTypes.CharacterData).map(data => data.name)
));  // Character names
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    context => context.data instanceof dataTypes.JumpData ? context.data.anchor : undefined,
    context => context.dataList.filterType(dataTypes.AnchorData).map(data => data.anchor)
)); // Jump anchors
TabCompleters.register(TabCompleter.ofCombined(
    new FileComplete(() => file.getPath(), 'txt'),
    context => context.data instanceof dataTypes.JumpData && context.data.crossFile
        ? context.data.anchor : undefined
)); // Jump files
TabCompleters.register(new TabCompleter(
    new AutoComplete(new dataTypes.CaseData('', {}).getPublicArgs()),
    context => isConfigKey(context.front) && parseLine(context.front) instanceof dataTypes.TransformData,
    context => getConfigKey(context.front)
)); // Case config keys
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    context => {
        const data = parseLine(context.front);
        if (data instanceof dataTypes.VarData && context.front.includes(':')) return data.expr;
        if (data instanceof dataTypes.SwitchData) return data.expr;
        if (isInterpolate(context.front, context.back))
            return context.front.replaceAll('${', ' ').split(/\s/).at(-1);
    },
    context => scanSymbols(context.dataList)
)); // Symbols
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    context => {
        const data = parseLine(context.front);
        if (context.front.includes(':')) return;
        if (data instanceof dataTypes.ImageData || data instanceof dataTypes.TransformData)
            return context.front.substring(context.front.search(']') + 1);
    },
    context => context.dataList.filterType(dataTypes.ImageData)
        .filter(data => data.imageFile.trim().startsWith('@'))
        .map(data => data.imageType)
        .concat(imageTypes)
)); // Image types
TabCompleters.register(TabCompleter.ofCombined(
    new FileComplete(() => file.getSourcePath()),
    context => {
        const data = parseLine(context.front);
        if (data instanceof dataTypes.ImageData && !context.front.includes(':'))
            return data.imageFile;
    }
)); // Image files
TabCompleters.register(new TabCompleter(
    new AutoComplete(transformTypes),
    context => isConfigKey(context.front) && parseLine(context.front) instanceof dataTypes.TransformData,
    context => getConfigKey(context.front)
)); // Transform types
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    context => {
        const data = parseLine(context.front);
        return data instanceof dataTypes.CallData && !context.front.includes('(') ? data.name : undefined;
    },
    context => context.dataList.filter(data => data instanceof dataTypes.FuncData).map(data => data.name)
)); // Func names
TabCompleters.register(TabCompleter.ofCombined(
    new FileComplete(() => file.getPath(), 'txt'),
    context => {
        const data = parseLine(context.front);
        return data instanceof dataTypes.ImportData && !context.front.includes(':') ? data.file : undefined;
    }
)); // Import files
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    context => {
        const data = parseLine(context.front);
        return data instanceof dataTypes.ImportData && context.front.includes(':')
            ? data.names.at(-1) : undefined;
    },
    async context => {
        const filename = (parseLine(context.line) as dataTypes.ImportData).file;
        const lines = (await file.readFile(filename)).splitLine();
        return scanSymbols(lines.map(parseLine));
    }
)); // Import symbol