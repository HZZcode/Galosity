'use strict';

const { ipcRenderer } = require('electron');
const parser = require('./parser');
const vars = require('./vars');
const { AutoComplete, FileComplete } = require('./completer');
const { Files } = require('./files');

const textarea = document.getElementById('input');
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
    insert(text, length = 0, pos = undefined) {
        const line = this.currentLine();
        if (pos === undefined) pos = this.currentColumn();
        const modified = line.substring(0, pos - length) + text + line.substring(pos);
        const start = this.start;
        this.edit(this.currentLineCount(), modified);
        textarea.selectionStart = textarea.selectionEnd = start + text.length - length;
    }
    move(step) {
        textarea.selectionStart += step;
        textarea.selectionEnd += step;
    }
    edit(line, modified) {
        this.lines[line] = modified;
        this.sync();
    }
    jumpTo(line) {
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
        textarea.scrollTop = scrollTop;
        document.body.removeChild(tempElement);
        textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}
class TagScanner {
    tag;
    constructor(tag) {
        this.tag = tag;
    }
    scanRawList() {
        const manager = new TextAreaManager();
        return manager.lines.filter(line => line.startsWith(this.tag));
    }
    scanList() {
        return this.scanRawList().map(line => line.substring(this.tag.length).trim());
    }
    scanLines(name) {
        const manager = new TextAreaManager();
        return manager.lines.filter(line => line.startsWith(this.tag)
            && line.substring(this.tag.length).trim() === name.trim())
            .map((_, index) => index);
    }
    scanLine(name) {
        const lines = this.scanLines(name);
        return lines.length === 0 ? -1 : lines[0];
    }
}
class ErrorManager {
    element;
    constructor() {
        this.element = document.getElementById('error');
    }
    error(msg) {
        this.element.innerText = msg;
    }
    assert(condition, msg) {
        if (!condition) this.error(msg);
    }
    clear() {
        this.element.innerText = '';
    }
}
class SaveLoadManager extends Files {
    constructor() {
        super();
    }
    async ofFile(file) {
        this.setFile(await ipcRenderer.invoke('resolve', file));
        return this;
    }
    async write(path) {
        if (path === null) return;
        const manager = new TextAreaManager();
        const content = manager.content;
        await ipcRenderer.invoke('writeFile', path, content)
            .then(async _ => {
                this.setFile(await ipcRenderer.invoke('resolve', path));
                updateInfo();
                info.innerText += ' Saved!';
                setTimeout(updateInfo, 1000);
            }).catch(e => {
                console.error(e);
                error.error(`Failed to Write to ${path}`);
            });
    }
    async read(path) {
        if (path === null) return;
        await ipcRenderer.invoke('readFile', path)
            .then(async content => {
                textarea.value = content;
                this.setFile(await ipcRenderer.invoke('resolve', path));
                updateInfo();
                return content;
            }).catch(e => {
                console.error(e);
                error.error(`Failed to Read from ${path}`);
            });
    }
    async getSavePath() {
        let path = null;
        await ipcRenderer.invoke('showSaveDialog', {
            defaultPath: 'gal.txt',
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        }).then(result => {
            if (result.canceled) return;
            path = result.filePath;
        });
        return path;
    }
    async getOpenPath() {
        let path = null;
        await ipcRenderer.invoke('showOpenDialog', {
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        }).then(result => {
            if (result.canceled) return;
            path = result.filePaths[0];
        });
        return path;
    }
    async autoSave() {
        if (this.valid) await this.write(this.filename);
    }
    async save(event) {
        if (event !== undefined) event.preventDefault();
        let path = this.filename;
        if (!this.valid && textarea.value === '') return;
        if (!this.valid) path = await this.getSavePath();
        await this.write(path);
    }
    async saveAs(event) {
        event.preventDefault();
        const path = await this.getSavePath();
        await this.write(path);
    }
    async open(event) {
        event.preventDefault();
        this.save();
        const path = await this.getOpenPath();
        await this.read(path);
    }
    new(event) {
        event.preventDefault();
        this.save();
        textarea.value = '';
        this.setFile(null);
    }
}
const info = document.getElementById('info');
const helpButton = document.getElementById('help');
helpButton.addEventListener('click', help);
const error = new ErrorManager();
const characters = new AutoComplete();
const tags = new AutoComplete([
    '[Character]', '[Part]', '[Note]',
    '[Jump]', '[Anchor]',
    '[Select]', '[Case]', '[Break]', '[End]',
    '[Var]', '[Enum]', '[Switch]',
    '[Input]', '[Delay]', '[Pause]',
    '[Image]', '[Transform]'
]);
// [Note] I hope to use less words with same beginning letters for better Tab completing
const anchorCompleter = new AutoComplete();
const symbolCompleter = new AutoComplete();
const imageTypes = ['background', 'left', 'center', 'right'];
const imageTypeCompleter = new AutoComplete();
const transformTypeCompleter = new AutoComplete(new parser.TransformData().getAllArgs());
const characterScanner = new TagScanner('[Character]');
const anchorScanner = new TagScanner('[Anchor]');
const imageTypeScanner = new TagScanner('[Image]');
const file = new SaveLoadManager();
const fileCompleter = new FileComplete(_ => file.getPath(), 'txt');
const imageCompleter = new FileComplete(_ => file.getSourcePath());
textarea.addEventListener('keydown', processKeyDown);
textarea.addEventListener('mouseup', jumpTo);
updateInfo();
textarea.addEventListener('input', updateInfo);
textarea.addEventListener('selectionchange', updateInfo);
setInterval(_ => file.autoSave(), 60000);
function updateInfo(_) {
    error.clear();
    const manager = new TextAreaManager();
    const filename = file.valid ? file.filename : 'Unnamed';
    info.innerText = `${filename}: Line ${manager.currentLineCount()}, Column ${manager.currentColumn()}`;
    scanControlBlocks();
}
async function processKeyDown(event) {
    const key = event.key;
    if (key === 'Tab') await autoComplete(event);
    else if (event.ctrlKey && key === '/') comment(event);
    else if (event.ctrlKey && event.shiftKey && key.toLowerCase() === 's') await file.saveAs(event);
    else if (event.ctrlKey && key.toLowerCase() === 's') await file.save(event);
    else if (event.ctrlKey && key.toLowerCase() === 'o') await file.open(event);
    else if (event.ctrlKey && key.toLowerCase() === 'n') file.new(event);
    else if (event.ctrlKey && key.toLowerCase() === 'h') await help(event);
    else if (key === 'F5') await test();
    else if (key === '{') completeBraces(event);
}
function completeBraces(event) {
    const manager = new TextAreaManager();
    const start = manager.start;
    const end = manager.end;
    if (start !== end) {
        manager.insert('}', 0, end);
        manager.move(-1);
    }
    else {
        const line = manager.currentLine();
        const pos = manager.currentColumn();
        if (line[pos - 1] === '$') {
            manager.insert('{}');
            manager.move(-1);
            event.preventDefault();
        }
    }
}
async function autoComplete(event) {
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
        await completeFile(event);
        await completeImage(event);
    }
}
async function completeFile(_) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Jump]') || front.search('>') === -1) return;
    const filePart = front.substring(front.search('>') + 1).trim();
    const file = await fileCompleter.completeInclude(filePart);
    if (file !== undefined) manager.insert(file, filePart.length);
}
async function completeImage(_) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Image]') || front.search(':') === -1) return;
    const imagePart = front.substring(front.search(':') + 1).trim();
    const image = await imageCompleter.completeInclude(imagePart);
    if (image !== undefined) manager.insert(image, imagePart.length);
}
function scanImageTypes() {
    return imageTypeScanner.scanRawList()
        .map(parser.parseLine)
        .filter(data => data.imageFile.trim().startsWith('@'))
        .map(data => data.imageType)
        .concat(imageTypes);
}
async function completeImageType(_) {
    const manager = new TextAreaManager();
    imageTypeCompleter.setList(scanImageTypes());
    const front = manager.currentLineFrontContent();
    if (!['[Image]', '[Transform]'].some(tag => front.trim().startsWith(tag))
        || front.search(':') !== -1) return;
    const typePart = front.substring(front.search(/\]/) + 1).trim();
    const type = await imageTypeCompleter.completeInclude(typePart);
    if (type !== undefined) manager.insert(type, typePart.length);
}
async function completeTransformType(_) {
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Transform]')
        || front.replaceAll(/=.*?,/g, '').includes('=')) return;
    const typePart = front.substring(Math.max(front.indexOf(':'),
        front.lastIndexOf(',')) + 1).replace('[Transform]', '').trim();
    const type = await transformTypeCompleter.completeInclude(typePart);
    if (type !== undefined) manager.insert(type, typePart.length);
}
async function completeCharaterName(_) {
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
async function completeTag(_) {
    const manager = new TextAreaManager();
    const line = manager.currentLine();
    const tag = await tags.complete('[' + line.replaceAll('[', '')
        .replaceAll(']', ''), line.search(']') === -1);
    if (tag !== undefined) manager.edit(manager.currentLineCount(), tag);
    if (['[Case]', '[Var]', '[Enum]', '[Image]', '[Transform]'].some(t => t === tag)) {
        manager.edit(manager.currentLineCount(), tag + ':');
        manager.move(-1);
    }
}
async function completeJump(_) {
    const manager = new TextAreaManager();
    const line = manager.currentLine();
    if (!line.trim().startsWith('[Jump]')) return;
    const anchors = anchorScanner.scanList();
    anchorCompleter.setList(anchors);
    const anchorPart = line.replace('[Jump]', '').trim();
    const anchor = await anchorCompleter.completeInclude(anchorPart);
    if (anchor !== undefined) manager.edit(manager.currentLineCount(), '[Jump] ' + anchor);
}
function getBuiltins() {
    const frame = new vars.GalVars();
    frame.initBuiltins();
    return [...Object.keys(frame.builtins), ...Object.keys(frame.builtinFuncs)];
}
async function completeSymbol(_) {
    const manager = new TextAreaManager();
    if (!needSymbol()) return;
    const symbols = [...scanSymbols(), ...getBuiltins()];
    symbolCompleter.setList(symbols);
    const symbolPart = manager.currentLineFrontContent().replaceAll('${', ' ').split(/\s/).at(-1);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbolPart)) return;
    const symbol = await symbolCompleter.completeInclude(symbolPart);
    if (symbol !== undefined) manager.insert(symbol, symbolPart.length);
}
function needSymbol() {
    const manager = new TextAreaManager();
    const isVar = /^\[Var\].*?:/.test(manager.currentLineFrontContent().trim());
    const isSwitch = manager.currentLineFrontContent().trim().startsWith('[Switch]');
    const leftInterpolate = manager.currentLineFrontContent().replaceAll(/\$\{.*?\}/g, '').includes('${');
    const rightInterpolate = manager.currentLineBackContent().replaceAll(/\$\{.*?\}/g, '').includes('}');
    return isVar || isSwitch || (leftInterpolate && rightInterpolate);
}
function scanSymbols() {
    const manager = new TextAreaManager();
    const paragraph = new parser.Paragraph(manager.lines);
    const dataList = paragraph.dataList;
    const varList = dataList.filter(data => data.type === 'var').map(data => data.name);
    
    const enumList = paragraph.scanEnums();
    const enumTypes = enumList.map(data => data.name);
    const enumValues = enumList.map(data => data.values).flat();
    
    return [... new Set([...varList, ...enumTypes, ...enumValues])]
        .filter(symbol => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbol));
} //Scans: var name; enum type; enum value;
function jumpTo(event) {
    if (!event.ctrlKey) return;
    const manager = new TextAreaManager();
    const front = manager.currentLineFrontContent();
    const line = manager.currentLine();
    if (front.search(':') === -1 && line.search(':') !== -1 && !line.trim().startsWith('[')) {
        const name = line.substring(0, line.search(':'));
        const pos = characterScanner.scanLine(name);
        if (pos !== -1) manager.jumpTo(pos);
    }
    else if (front.trim().startsWith('[Jump]')) {
        const anchor = line.replace('[Jump]', '').trim();
        const pos = anchorScanner.scanLine(anchor);
        if (pos !== -1) manager.jumpTo(pos);
    }
    else if (line.trim().startsWith('[End]')) {
        const index = manager.currentLineCount();
        const blocks = scanControlBlocks();
        for (const block of blocks) {
            if (block.endPos === index) {
                manager.jumpTo(block.startPos);
                return;
            }
        }
    }
    else if (line.trim().startsWith('[Case]')) {
        const index = manager.currentLineCount();
        const blocks = scanControlBlocks();
        for (const block of blocks) {
            if (block.casesPosList.some(i => i === index)) {
                manager.jumpTo(block.startPos);
                return;
            }
        }
    }
}
function comment(_) {
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
        return new parser.Paragraph(manager.lines).getControlBlocks();
    } catch (e) {
        console.error(e);
        error.error(e);
    }
}
async function test(fileManager = file, content = textarea.value) {
    await file.autoSave();
    await ipcRenderer.invoke('test', { content: content, filename: fileManager.filename });
}
async function help(event) {
    event.preventDefault();
    const content = await ipcRenderer.invoke('readFile', 'example.txt').catch(e => {
        console.error(e);
        error.error(`Cannot find example.txt`);
    });
    await test(await new SaveLoadManager().ofFile('example.txt'), content);
}