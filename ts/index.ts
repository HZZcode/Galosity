import { GalIpcRenderer } from "./types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import {
    TransformData, parseLine, Paragraph, ImageData, VarData,
    ImportData, GalData, FuncData, JumpData, CallData
} from './parser.js';
import { GalVars } from './vars.js';
import { AutoComplete, FileComplete } from './completer.js';
import { Files } from './files.js';
import { logger } from './logger.js';
import { isInterpolate } from './split.js';
import { bindFunction } from "./bind-function.js";

const textarea = document.getElementById('input') as HTMLTextAreaElement;
class TextAreaManager {
    content;
    start;
    end;
    lines;
    constructor() {
        this.content = textarea.value;
        this.start = textarea.selectionStart;
        this.end = textarea.selectionEnd;
        this.lines = this.content.split(/\r?\n/);
    }
    sync() {
        const line = this.currentLineCount();
        textarea.value = this.lines.join('\n');
        this.jumpTo(line);
    }
    currentLineCount() {
        return this.content.substring(0, this.start).split(/\r?\n/).length - 1;
    }
    currentEndLineCount() {
        return this.content.substring(0, this.end).split(/\r?\n/).length - 1;
    }
    currentColumn() {
        return this.currentLineFrontContent().length;
    }
    currentLine() {
        return this.lines[this.currentLineCount()];
    }
    currentLineFrontContent() {
        return this.content.substring(0, this.start).split(/\r?\n/)[this.currentLineCount()];
    }
    currentLineBackContent() {
        return this.content.substring(this.start).split(/\r?\n/)[0];
    }
    beforeLines() {
        return this.lines.slice(0, this.currentLineCount());
    }
    beforeLinesLength() {
        return this.beforeLines().join('\n').length + 1;
    }
    insert(text: string, length = 0, pos?: number) {
        const line = this.currentLine();
        if (pos === undefined) pos = this.currentColumn();
        const modified = line.substring(0, pos - length) + text + line.substring(pos);
        const start = this.start;
        this.edit(this.currentLineCount(), modified);
        textarea.selectionStart = textarea.selectionEnd = start + text.length - length;
    }
    complete(text: string, part: string) {
        this.insert(text, part.length);
    }
    move(step: number) {
        textarea.selectionStart += step;
        textarea.selectionEnd += step;
    }
    edit(line: number, modified: string) {
        this.lines[line] = modified;
        this.sync();
    }
    jumpTo(line: number) {
        textarea.focus(); // does so fixes bugs. don't know why but just works.
        const endOfLine = this.lines.slice(0, line + 1).join('\n').length;
        textarea.selectionStart = textarea.selectionEnd = endOfLine;
        const tempElement = document.createElement('div');
        tempElement.style.position = 'absolute';
        tempElement.style.visibility = 'hidden';
        tempElement.style.whiteSpace = 'pre-wrap';
        tempElement.style.fontFamily = textarea.style.fontFamily;
        tempElement.style.fontSize = textarea.style.fontSize;
        tempElement.innerHTML = textarea.value.substring(0, endOfLine);
        document.body.appendChild(tempElement);
        const lineHeight = tempElement.offsetHeight / (line + 1);
        const scrollTop = line * lineHeight;
        document.body.removeChild(tempElement);
        textarea.scrollTop = scrollTop;
        textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}
class TagScanner {
    tag;
    constructor(tag: string) {
        this.tag = tag;
    }
    scanRawList() {
        const manager = new TextAreaManager();
        return manager.lines.filter(line => line.startsWith(this.tag));
    }
    scanList() {
        return this.scanRawList().map(line => line.substring(this.tag.length).trim());
    }
    scanLines(name: string) {
        const manager = new TextAreaManager();
        return manager.lines.map((line, index): [string, number] => [line, index])
            .filter(entry => entry[0].startsWith(this.tag)
                && entry[0].substring(this.tag.length).trim() === name.trim())
            .map(entry => entry[1]);
    }
    scanLine(name: string) {
        const lines = this.scanLines(name);
        return lines.length === 0 ? -1 : lines[0];
    }
}
class ErrorManager {
    element;
    constructor() {
        this.element = document.getElementById('error') as HTMLDivElement;
    }
    error(msg: string) {
        this.element.innerText = msg;
    }
    assert(condition: boolean, msg: string) {
        if (!condition) this.error(msg);
    }
    clear() {
        this.element.innerText = '';
    }
}
class FileManager extends Files {
    previousFiles: string[] = [];
    constructor() {
        super();
    }
    async ofFile(file: string) {
        this.setFile(await this.resolve(file));
        return this;
    }
    async write(path: string) {
        if (path === null) return;
        const manager = new TextAreaManager();
        const content = manager.content;
        try {
            await this.writeFile(path, content);
            this.setFile(await this.resolve(path));
            updateInfo();
            info.innerText += ' Saved!';
            setTimeout(updateInfo, 1000);
        } catch (e) {
            logger.error(e as string);
            error.error(`Failed to Write to ${path}`);
        }
    }
    async read(path?: string, memorize = true) {
        if (path === undefined) return;
        try {
            if (memorize) await this.remember();
            const content = await this.readFile(path);
            textarea.value = content;
            this.setFile(await this.resolve(path));
            updateInfo();
            return content;
        } catch (e) {
            logger.error(e as string);
            error.error(`Failed to Read from ${path}`);
        };
    }
    async remember() {
        await this.check();
        const file = this.filename!;
        if (this.valid && this.previousFiles.at(-1) !== file)
            this.previousFiles.push(file);
    }
    async autoSave() {
        if (this.valid) await this.write(this.filename!);
    }
    async save(event?: Event) {
        if (event !== undefined) event.preventDefault();
        let path = this.filename;
        if (!this.valid && textarea.value === '') return;
        if (!this.valid) path = await this.requestSavePath();
        if (path !== undefined) await this.write(path);
    }
    async saveAs(event?: Event) {
        if (event !== undefined) event.preventDefault();
        const path = await this.requestSavePath();
        if (path !== undefined) await this.write(path);
    }
    async openFile(path?: string, memorize = true) {
        if (path === undefined) return;
        this.save();
        await this.read(path, memorize);
    }
    async back(event?: Event) {
        if (event !== undefined) event.preventDefault();
        await this.openFile(this.previousFiles.pop(), false);
    }
    async open(event?: Event) {
        if (event !== undefined) event.preventDefault();
        await this.openFile(await this.requestOpenPath());
    }
    async new(event?: Event) {
        if (event !== undefined) event.preventDefault();
        await this.save();
        textarea.value = '';
        this.setFile(undefined);
    }
}
const info = document.getElementById('info') as HTMLDivElement;
const error = new ErrorManager();
const characters = new AutoComplete();
const tags = new AutoComplete([
    '[Character]', '[Part]', '[Note]',
    '[Jump]', '[Anchor]',
    '[Select]', '[Case]', '[Break]', '[End]',
    '[Var]', '[Enum]', '[Switch]',
    '[Input]', '[Delay]', '[Pause]', '[Eval]',
    '[Image]', '[Transform]',
    '[Func]', '[Return]', '[Call]',
    '[Import]'
]);
const colonTags = ['[Case]', '[Var]', '[Enum]', '[Image]', '[Transform]', '[Import]'];
// [Note] I hope to use less words with same beginning letters for better Tab completing
const anchorCompleter = new AutoComplete();
const symbolCompleter = new AutoComplete();
const imageTypes = ['background', 'left', 'center', 'right'];
const imageTypeCompleter = new AutoComplete();
const transformTypeCompleter = new AutoComplete(new TransformData().getAllArgs());
const caseConfigCompleter = new AutoComplete(['show', 'enable']);
const funcNameCompleter = new AutoComplete();
const characterScanner = new TagScanner('[Character]');
const anchorScanner = new TagScanner('[Anchor]');
const imageTypeScanner = new TagScanner('[Image]');
const file = new FileManager();
const fileCompleter = new FileComplete(() => file.getPath(), 'txt');
const imageCompleter = new FileComplete(() => file.getSourcePath());
textarea.addEventListener('keydown', processKeyDown);
textarea.addEventListener('mouseup', jump);
updateInfo();
textarea.addEventListener('input', updateInfo);
textarea.addEventListener('selectionchange', updateInfo);
setInterval(async () => await file.autoSave(), 60000);
(() => {
    bindFunction('new', file.new.bind(file));
    bindFunction('open', file.open.bind(file));
    bindFunction('save', file.save.bind(file));
    bindFunction('save-as', file.saveAs.bind(file));
    bindFunction('help', help);

    bindFunction('tab', autoComplete);
    bindFunction('comment', comment);
    bindFunction('jump', jumpTo);
    bindFunction('back', file.back.bind(file));
    bindFunction('test', test);
})();
async function processKeyDown(event: KeyboardEvent) {
    const key = event.key;

    if (event.ctrlKey && key.toLowerCase() === 'n') await file.new(event);
    else if (event.ctrlKey && key.toLowerCase() === 'o') await file.open(event);
    else if (event.ctrlKey && event.shiftKey && key.toLowerCase() === 's') await file.saveAs(event);
    else if (event.ctrlKey && key.toLowerCase() === 's') await file.save(event);
    else if (event.ctrlKey && key.toLowerCase() === 'h') await help(event);

    else if (key === 'Tab') await autoComplete(event);
    else if (event.ctrlKey && key === '/') comment(event);
    else if (event.ctrlKey && key.toLowerCase() === 'b') await file.back(event);
    else if (key === 'F5') await test();

    else if (key === '{') completeBraces(event);
    else if (key === '(') completeParentheses(event);
    else if (event.ctrlKey && key.toLowerCase() === 'l') completeLatex(event);
}
function updateInfo(_?: Event) {
    error.clear();
    const manager = new TextAreaManager();
    const filename = file.valid ? file.filename : 'Unnamed';
    info.innerText = `${filename}: Line ${manager.currentLineCount()}, Column ${manager.currentColumn()}`;
    scanControlBlocks();
}
function completeBraces(event: Event) {
    const manager = new TextAreaManager();
    const start = manager.start - manager.beforeLinesLength();
    const end = manager.end - manager.beforeLinesLength();
    if (start !== end) {
        manager.insert('}', 0, end);
        manager.move(-1);
    }
    else {
        const line = manager.currentLine();
        const pos = manager.currentColumn();
        if (['$', '^', '_', '%', '~'].includes(line[pos - 1])) {
            manager.insert('{}');
            manager.move(-1);
            event.preventDefault();
        }
    }
}
function completeParentheses(event: Event) {
    const manager = new TextAreaManager();
    const start = manager.start - manager.beforeLinesLength();
    const end = manager.end - manager.beforeLinesLength();
    if (start !== end) {
        manager.insert(')', 0, end);
        manager.move(-1);
    }
    else {
        const front = manager.currentLineFrontContent().trim();
        if (['[Func]', '[Call]'].some(tag => front.startsWith(tag))) {
            manager.insert('()');
            manager.move(-1);
            event.preventDefault();
        }
    }
}
function completeLatex(event: KeyboardEvent) {
    event.preventDefault();
    const manager = new TextAreaManager();
    const start = manager.start - manager.beforeLinesLength();
    const end = manager.end - manager.beforeLinesLength();
    const before = event.shiftKey ? '$$' : '\\(';
    const after = event.shiftKey ? '$$' : '\\)';
    if (start !== end) {
        manager.insert(after, 0, end);
        manager.move(-2);
        manager.insert(before, 0, start);
    }
    else {
        manager.insert(before + after);
        manager.move(-2);
    }
}
async function autoComplete(event: Event) {
    const manager = new TextAreaManager();
    event.preventDefault();
    let line = manager.currentLine();
    const front = manager.currentLineFrontContent();
    if (line.trim().startsWith('【')) {
        line = line.replace('【', '[');
        manager.edit(manager.currentLineCount(), line);
    }
    if (line.trim().startsWith('[') && (line.search(']') === -1 || front.trim().endsWith(']')))
        await completeTag(event);
    else {
        await completeCharaterName(event);
        await completeJump(event);
        await completeSymbol(event);
        await completeImageType(event);
        await completeTransformType(event);
        await completeJumpFile(event);
        await completeImage(event);
        await completeCaseConfig(event);
        await completeFunctions(event);
        await completeImportFile(event);
        await completeImportSymbol(event);
    }
}
async function completeJumpFile(_?: Event) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Jump]') || front.search('>') === -1) return;
    const filePart = front.substring(front.search('>') + 1).trim();
    const file = await fileCompleter.completeInclude(filePart);
    if (file !== undefined) manager.complete(file, filePart);
}
async function completeImage(_?: Event) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Image]') || front.search(':') === -1) return;
    const imagePart = front.substring(front.search(':') + 1).trim();
    const image = await imageCompleter.completeInclude(imagePart);
    if (image !== undefined) manager.complete(image, imagePart);
}
function scanImageTypes() {
    return (imageTypeScanner.scanRawList()
        .map(parseLine) as ImageData[])
        .filter(data => data.imageFile.trim().startsWith('@'))
        .map(data => data.imageType)
        .concat(imageTypes);
}
async function completeImageType(_?: Event) {
    const manager = new TextAreaManager();
    imageTypeCompleter.setList(scanImageTypes());
    const front = manager.currentLineFrontContent();
    if (!['[Image]', '[Transform]'].some(tag => front.trim().startsWith(tag))
        || front.search(':') !== -1) return;
    const typePart = front.substring(front.search(/\]/) + 1).trim();
    const type = await imageTypeCompleter.completeInclude(typePart);
    if (type !== undefined) manager.complete(type, typePart);
}
async function completeTransformType(_?: Event) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Transform]')
        || front.replaceAll(/=.*?,/g, '').includes('=')) return;
    const typePart = front.substring(Math.max(front.indexOf(':'),
        front.lastIndexOf(',')) + 1).replace('[Transform]', '').trim();
    const type = await transformTypeCompleter.completeInclude(typePart);
    if (type !== undefined) manager.complete(type, typePart);
}
async function completeCaseConfig(_?: Event) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Case]')
        || front.replaceAll(/=.*?,/g, '').includes('=')) return;
    const configPart = front.substring(Math.max(front.indexOf(':'),
        front.lastIndexOf(',')) + 1).replace('[Case]', '').trim();
    const config = await caseConfigCompleter.completeInclude(configPart);
    if (config !== undefined) manager.complete(config, configPart);
}
async function completeCharaterName(_?: Event) {
    characters.setList(characterScanner.scanList());
    const manager = new TextAreaManager();
    const line = manager.currentLine();
    const colonPos = line.search(':');
    if (colonPos !== -1 && colonPos !== line.length - 1) return;
    if (line.trim().startsWith('[')) return;
    const namePart = line;
    const name = await characters.complete(namePart, colonPos === -1);
    if (name !== undefined) manager.edit(manager.currentLineCount(), name + ':');
}
async function completeTag(_?: Event) {
    const manager = new TextAreaManager();
    const line = manager.currentLine();
    const tag = await tags.complete('[' + line.replaceAll('[', '')
        .replaceAll(']', ''), line.search(']') === -1);
    if (tag !== undefined) manager.edit(manager.currentLineCount(), tag);
    if (colonTags.some(t => t === tag)) {
        manager.edit(manager.currentLineCount(), tag + ':');
        manager.move(-1);
    }
}
async function completeJump(_?: Event) {
    const manager = new TextAreaManager();
    const line = manager.currentLine();
    if (!line.trim().startsWith('[Jump]')) return;
    const anchors = anchorScanner.scanList();
    anchorCompleter.setList(anchors);
    const anchorPart = line.replace('[Jump]', '').trim();
    const anchor = await anchorCompleter.completeInclude(anchorPart);
    if (anchor !== undefined) manager.complete(anchor, anchorPart);
}
function getBuiltins() {
    const frame = new GalVars();
    frame.initBuiltins();
    return [...Object.keys(frame.builtins), ...Object.keys(frame.builtinFuncs)];
}
async function completeSymbol(_?: Event) {
    const manager = new TextAreaManager();
    if (!needSymbol()) return;
    const symbols = [...scanSymbols(), ...getBuiltins()];
    symbolCompleter.setList(symbols);
    const symbolPart = manager.currentLineFrontContent().replaceAll('${', ' ').split(/\s/).at(-1);
    if (symbolPart === undefined || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbolPart)) return;
    const symbol = await symbolCompleter.completeInclude(symbolPart);
    if (symbol !== undefined) manager.complete(symbol, symbolPart);
}
function needSymbol() {
    const manager = new TextAreaManager();
    const isVar = /^\[Var\].*?:/.test(manager.currentLineFrontContent().trim());
    const isSwitch = manager.currentLineFrontContent().trim().startsWith('[Switch]');
    const isInterpolation = isInterpolate(manager.currentLineFrontContent(),
        manager.currentLineBackContent());
    return isVar || isSwitch || isInterpolation;
}
function scanSymbols(lines?: string[]) {
    if (lines === undefined) lines = new TextAreaManager().lines;
    const paragraph = new Paragraph(lines);
    const dataList = paragraph.dataList;
    const varList = dataList.filter(data => data instanceof VarData).map(data => data.name);

    const enumList = paragraph.scanEnums();
    const enumTypes = enumList.map(data => data.name);
    const enumValues = enumList.map(data => data.values).flat();

    const importedSymbols = dataList.filter(data => data instanceof ImportData)
        .map(data => data.names).flat();

    return [... new Set([...varList, ...enumTypes, ...enumValues, ...importedSymbols])]
        .filter(symbol => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbol));
} //Scans: var name; enum type; enum value; imported symbols
async function completeFunctions(_?: Event) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent().trim();
    if (front.startsWith('[Call]') && !front.includes('(')) {
        funcNameCompleter.setList(Object.keys(scanFunctions()));
        const funcPart = front.replace('[Call]', '').trim();
        const funcName = await funcNameCompleter.completeInclude(funcPart);
        if (funcName !== undefined) manager.complete(funcName, funcPart);
    }
}
function scanFunctions() {
    return Object.fromEntries(
        new Paragraph(new TextAreaManager().lines).dataList
            .map((data, line): [GalData, number] => [data, line])
            .filter(entry => entry[0] instanceof FuncData)
            .map(entry => [(entry[0] as FuncData).name, entry[1]])
    );
}
async function completeImportFile(_?: Event) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Import]') || front.search(':') !== -1) return;
    const filePart = front.replace('[Import]', '').trim();
    const file = await fileCompleter.completeInclude(filePart);
    if (file !== undefined) manager.complete(file, filePart);
}
async function completeImportSymbol(_?: Event) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Import]') || front.search(':') === -1) return;
    const data = parseLine(front) as ImportData;
    const completer = new AutoComplete(scanSymbols((await file.readFile(data.file)).split(/\r?\n/)));
    const symbolPart = data.names.at(-1)!;
    const symbol = await completer.completeInclude(symbolPart);
    if (symbol !== undefined) manager.complete(symbol, symbolPart);
}
async function jump(event: MouseEvent) {
    if (!event.ctrlKey) return;
    await jumpTo(event);
}
async function jumpTo(_?: Event) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    const line = manager.currentLine();
    if (front.search(':') === -1 && line.search(':') !== -1 && !line.trim().startsWith('[')) {
        const name = line.substring(0, line.search(':'));
        const pos = characterScanner.scanLine(name);
        if (pos !== -1) manager.jumpTo(pos);
    }
    else if (front.trim().startsWith('[Jump]')) {
        const data = parseLine(line) as JumpData;
        const anchor = data.anchor;
        if (data.crossFile) await file.openFile(anchor);
        else if (data.href) ipcRenderer.invoke('openExternal', anchor);
        else {
            const pos = anchorScanner.scanLine(anchor);
            if (pos !== -1) manager.jumpTo(pos);
        }
    }
    else if (line.trim().startsWith('[End]')) {
        const index = manager.currentLineCount();
        const blocks = scanControlBlocks();
        for (const block of blocks ?? []) {
            if (block.endPos === index) {
                manager.jumpTo(block.startPos);
                return;
            }
        }
    }
    else if (line.trim().startsWith('[Case]')) {
        const index = manager.currentLineCount();
        const blocks = scanControlBlocks();
        for (const block of blocks ?? []) {
            if (block.casesPosList.some(i => i === index)) {
                manager.jumpTo(block.startPos);
                return;
            }
        }
    }
    else if (front.trim().startsWith('[Call]')) {
        const name = (parseLine(line) as CallData).name;
        const funcs = scanFunctions();
        if (name in funcs) {
            manager.jumpTo(funcs[name]);
            return;
        }
    }
    else if (front.trim().startsWith('[Import]')) {
        const path = (parseLine(line) as ImportData).file;
        await file.openFile(path);
    }
}
function comment(_?: Event) {
    const manager = new TextAreaManager();
    const start = manager.currentLineCount();
    const end = manager.currentEndLineCount();
    const lines = manager.lines.slice(start, end + 1);
    if (lines.every(line => line.trim().startsWith('//')))
        for (const [index, line] of lines.entries())
            lines[index] = line.replace('//', '').trim();
    else for (const [index, line] of lines.entries())
        lines[index] = '// ' + line;
    for (const [index, line] of lines.entries())
        manager.edit(start + index, line);
}
function scanControlBlocks() {
    const manager = new TextAreaManager();
    try {
        return new Paragraph(manager.lines).getControlBlocks();
    } catch (e) {
        logger.error(e as string);
        error.error(e as string);
    }
}
async function test(fileManager = file, content = textarea.value) {
    await file.autoSave();
    await ipcRenderer.invoke('test', {
        content: content,
        filename: fileManager.filename,
        isDebug: logger.isDebug
    });
}
async function help(event: Event) {
    event.preventDefault();
    const content = await file.readFile('example.txt').catch(e => {
        logger.error(e);
        error.error(`Cannot find example.txt`);
    });
    await test(await new FileManager().ofFile('example.txt'), content);
}

ipcRenderer.on('send-data', async (_, data) => {
    logger.isDebug = data.isDebug;
    if (data.file !== null) await file.read(data.file);
    else if (data.isDebug) await file.read('gal.txt');
});

ipcRenderer.on('before-close', async () => {
    await file.save();
    ipcRenderer.send('before-close-complete');
});