import * as dataTypes from "../parser/data-types.js";
import { Paragraph, parseLine } from "../parser/parser.js";
import { isInterpolate } from "../utils/split.js";
import { Func } from "../utils/type-dispatch.js";
import { GalVars } from "../vars/vars.js";
import { AutoComplete, FileComplete } from "./completer.js";
import { file } from "./file-manager.js";
import { TextAreaManager } from "./text-manager.js";

export class TabCompleter {
    complete;
    predicate;
    partGetter;
    scanner;

    constructor(complete: AutoComplete, predicate: (manager: TextAreaManager) => boolean,
        partGetter: (frontContent: string, backContent?: string) => string,
        scanner?: Func<[dataList: dataTypes.GalData[], content?: string], string[]>) {
        this.complete = complete;
        this.predicate = predicate;
        this.partGetter = partGetter;
        this.scanner = scanner;
    }

    static of(complete: AutoComplete,
        predicate: (frontContent: string, backContent?: string) => boolean,
        partGetter: (frontContent: string, backContent?: string) => string,
        scanner?: Func<[dataList: dataTypes.GalData[], content?: string], string[]>) {
        return new TabCompleter(
            complete,
            manager => predicate(manager.currentLineFrontContent(), manager.currentLineBackContent()),
            partGetter,
            scanner
        );
    }

    static ofCombined(complete: AutoComplete,
        predicateAndPartGetter: (frontContent: string, backContent?: string) => string | undefined,
        scanner?: Func<[dataList: dataTypes.GalData[], content?: string], string[]>) {
        return new TabCompleter(
            complete,
            manager => predicateAndPartGetter(manager.currentLineFrontContent(),
                manager.currentLineBackContent()) !== undefined,
            (front, back) => predicateAndPartGetter(front, back)!,
            scanner
        );
    }

    static ofData(complete: AutoComplete,
        predicateAndPartGetter: (frontData: dataTypes.GalData, backContent?: string) => string | undefined,
        scanner?: Func<[dataList: dataTypes.GalData[], content?: string], string[]>) {
        return TabCompleter.ofCombined(
            complete,
            (front, back) => predicateAndPartGetter(parseLine(front), back)!,
            scanner
        );
    }

    async apply(manager: TextAreaManager): Promise<boolean> {
        if (!this.predicate(manager)) return false;
        if (this.scanner !== undefined)
            this.complete.setList(await this.scanner(new Paragraph(manager.lines).dataList,
                manager.currentLine()));
        const part = this.partGetter(manager.currentLineFrontContent(),
            manager.currentLineBackContent()).trim();
        const word = await this.complete.completeInclude(part);
        if (word === undefined) return false;
        manager.complete(word, part);
        return true;
    }
}

export class TabCompleters {
    private static completers: TabCompleter[] = [];

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

TabCompleters.register(TabCompleter.of(
    new AutoComplete(tags.map(tag => colonTags.includes(tag) ? (tag + ':') : tag)),
    front => front.trim().startsWith('[') && (!front.includes(']') || front.trim().endsWith(']')),
    front => front,
)); // Tags
TabCompleters.register(TabCompleter.of(
    new AutoComplete(),
    front => !front.includes('[') && (!front.includes(':') || front.search(':') === front.length - 1),
    front => front.replace(':', ''),
    dataList => dataList.filterType(dataTypes.CharacterData).map(data => data.name)
));  // Character names
TabCompleters.register(TabCompleter.ofData(
    new AutoComplete(),
    data => data instanceof dataTypes.JumpData ? data.anchor : undefined,
    dataList => dataList.filterType(dataTypes.AnchorData).map(data => data.anchor)
)); // Jump anchors
TabCompleters.register(TabCompleter.ofData(
    new FileComplete(() => file.getPath(), 'txt'),
    data => data instanceof dataTypes.JumpData && data.crossFile ? data.anchor : undefined
)); // Jump files
TabCompleters.register(TabCompleter.of(
    new AutoComplete(new dataTypes.CaseData('', {}).getPublicArgs()),
    front => isConfigKey(front) && parseLine(front) instanceof dataTypes.TransformData,
    getConfigKey
)); // Case config keys
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    (front, back) => {
        const data = parseLine(front);
        if (data instanceof dataTypes.VarData && front.includes(':')) return data.expr;
        if (data instanceof dataTypes.SwitchData) return data.expr;
        if (isInterpolate(front, back!)) return front.replaceAll('${', ' ').split(/\s/).at(-1);
    },
    scanSymbols
)); // Symbols
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    front => {
        const data = parseLine(front);
        if (front.includes(':')) return;
        if (data instanceof dataTypes.ImageData || data instanceof dataTypes.TransformData)
            return front.substring(front.search(']') + 1);
    },
    dataList => dataList.filterType(dataTypes.ImageData)
        .filter(data => data.imageFile.trim().startsWith('@'))
        .map(data => data.imageType)
        .concat(imageTypes)
)); // Image types
TabCompleters.register(TabCompleter.ofCombined(
    new FileComplete(() => file.getSourcePath()),
    front => {
        const data = parseLine(front);
        if (data instanceof dataTypes.ImageData && !front.includes(':'))
            return data.imageFile;
    }
)); // Image files
TabCompleters.register(TabCompleter.of(
    new AutoComplete(transformTypes),
    front => isConfigKey(front) && parseLine(front) instanceof dataTypes.TransformData,
    getConfigKey
)); // Transform types
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    front => {
        const data = parseLine(front);
        return data instanceof dataTypes.CallData && !front.includes('(') ? data.name : undefined;
    },
    dataList => dataList.filter(data => data instanceof dataTypes.FuncData).map(data => data.name)
)); // Func names
TabCompleters.register(TabCompleter.ofCombined(
    new FileComplete(() => file.getPath(), 'txt'),
    front => {
        const data = parseLine(front);
        return data instanceof dataTypes.ImportData && !front.includes(':') ? data.file : undefined;
    }
)); // Import files
TabCompleters.register(TabCompleter.ofCombined(
    new AutoComplete(),
    front => {
        const data = parseLine(front);
        return data instanceof dataTypes.ImportData && front.includes(':') ? data.names.at(-1) : undefined;
    },
    async (_, content) => {
        const filename = (parseLine(content!) as dataTypes.ImportData).file;
        const lines = (await file.readFile(filename)).split(/\r?\n/);
        return scanSymbols(lines.map(parseLine));
    }
)); // Import symbol