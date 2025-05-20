'use strict';

const { ipcRenderer } = require('electron');
const parser = require('./parser');
const vars = require('./vars');

class AutoComplete {
    list;
    chosenFoundIndex = 0;
    found = [];
    constructor(list = []) {
        this.list = list;
    }
    clear() {
        this.chosenFoundIndex = 0;
        this.found = [];
    }
    complete(start, isFirstComplete = true) {
        if (!isFirstComplete) {
            this.chosenFoundIndex++;
            this.chosenFoundIndex %= this.found.length;
        }
        else {
            this.clear();
            for (let l of this.list)
                if (l.toLowerCase().startsWith(start.toLowerCase()))
                    this.found.push(l);
        }
        return this.found[this.chosenFoundIndex];
    }
}
const textarea = document.getElementById('input');
class TextAreaManager {
    content
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
        let line = this.currentLineCount();
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
        let line = this.currentLine();
        if (pos === undefined) pos = this.currentColumn();
        let modified = line.substring(0, pos - length) + text + line.substring(pos);
        let start = this.start;
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
        let endOfLine = this.lines.slice(0, line + 1).join('\n').length;
        textarea.selectionStart = textarea.selectionEnd = endOfLine;
        let tempElement = document.createElement('div');

        tempElement.style.position = 'absolute';
        tempElement.style.visibility = 'hidden';
        tempElement.style.whiteSpace = 'pre-wrap';
        tempElement.style.fontFamily = textarea.style.fontFamily;
        tempElement.style.fontSize = textarea.style.fontSize;
        tempElement.innerHTML = textarea.value.substring(0, endOfLine);
        document.body.appendChild(tempElement);
        let lineHeight = tempElement.offsetHeight / (line + 1);
        let scrollTop = line * lineHeight;
        textarea.scrollTop = scrollTop;
        document.body.removeChild(tempElement);
        textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}
class TagScanner {
    tag;
    list = [];
    constructor(tag) {
        this.tag = tag;
    }
    scanList() {
        let manager = new TextAreaManager();
        this.list = [];
        for (let line of manager.lines)
            if (line.startsWith(this.tag))
                this.list.push(line.substring(this.tag.length).trim());
        return this.list;
    }
    scanLine(name) {
        let manager = new TextAreaManager();
        this.list = [];
        for (let [index, line] of manager.lines.entries())
            if (line.startsWith(this.tag) && line.substring(this.tag.length).trim() === name.trim())
                return index;
        return -1;
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
class SaveLoadManager {
    currentFile = null;
    constructor() { }
    async ofFile(file) {
        this.currentFile = await ipcRenderer.invoke('resolve', file);
        return this;
    }
    async write(path) {
        if (path === null) return;
        const manager = new TextAreaManager();
        const content = manager.content;
        await ipcRenderer.invoke('writeFile', path, content)
            .then(async _ => {
                this.currentFile = await ipcRenderer.invoke('resolve', path);
                updateInfo();
                info.innerText += ' Saved!';
                setTimeout(updateInfo, 1000);
            }).catch(_ => {
                console.error(e);
                error.error(`Failed to Write to ${path}`);
            });
    }
    async read(path) {
        if (path === null) return;
        await ipcRenderer.invoke('readFile', path)
            .then(async content => {
                textarea.value = content;
                this.currentFile = await ipcRenderer.invoke('resolve', path);
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
        }).then(async result => {
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
        }).then(async result => {
            if (result.canceled) return;
            path = result.filePaths[0];
        });
        return path;
    }
    async autoSave() {
        await this.write(this.currentFile);
    }
    async save(event) {
        if (event !== undefined) event.preventDefault();
        let path = this.currentFile;
        if (path === null && textarea.value === '') return;
        if (path === null) path = await this.getSavePath();
        await this.write(path);
    }
    async saveAs(event) {
        event.preventDefault();
        let path = await this.getSavePath();
        await this.write(path);
    }
    async open(event) {
        event.preventDefault();
        this.save();
        let path = await this.getOpenPath();
        await this.read(path);
    }
    async new(event) {
        event.preventDefault();
        this.save();
        textarea.value = '';
        this.currentFile = null;
    }
}
const info = document.getElementById('info');
const helpButton = document.getElementById('help');
helpButton.addEventListener('click', help);
const error = new ErrorManager();
let characters = new AutoComplete();
let tags = new AutoComplete([
    '[Character]', '[Part]', '[Note]',
    '[Jump]', '[Anchor]',
    '[Select]', '[Case]', '[Break]', '[End]',
    '[Var]', '[Enum]', '[Switch]',
    '[Input]', '[Delay]', '[Pause]',
    '[Image]', '[Transform]'
]);
// [Note] I hope to use less words with same beginning letters for better Tab completing
let anchorCompleter = new AutoComplete();
let symbolCompleter = new AutoComplete();
let imageTypeCompleter = new AutoComplete([
    'background', 'left', 'center', 'right'
]);
let transformTypeCompleter = new AutoComplete(new parser.TransformData().getAllArgs());
let characterScanner = new TagScanner('[Character]');
let anchorScanner = new TagScanner('[Anchor]');
let file = new SaveLoadManager();
textarea.addEventListener('keydown', processKeyDown);
textarea.addEventListener('mouseup', jumpTo);
updateInfo();
textarea.addEventListener('input', updateInfo);
textarea.addEventListener('selectionchange', updateInfo);
setInterval(_ => file.autoSave(), 60000);
function updateInfo(_) {
    error.clear();
    let manager = new TextAreaManager();
    let filename = file.currentFile === null ? 'Unnamed' : file.currentFile;
    info.innerText = `${filename}: Line ${manager.currentLineCount()}, Column ${manager.currentColumn()}`;
    scanControlBlocks();
}
async function processKeyDown(event) {
    let key = event.key;
    if (key === 'Tab') autoComplete(event);
    else if (event.ctrlKey && key === '/') comment(event);
    else if (event.ctrlKey && event.shiftKey && key.toLowerCase() === 's') await file.saveAs(event);
    else if (event.ctrlKey && key.toLowerCase() === 's') await file.save(event);
    else if (event.ctrlKey && key.toLowerCase() === 'o') await file.open(event);
    else if (event.ctrlKey && key.toLowerCase() === 'n') await file.new(event);
    else if (event.ctrlKey && key.toLowerCase() === 'h') await help(event);
    else if (key === 'F5') await test();
    else if (key === '{') completeBraces(event);
}
function completeBraces(event) {
    let manager = new TextAreaManager();
    let start = manager.start;
    let end = manager.end;
    if (start !== end) {
        manager.insert('}', 0, end);
        manager.move(-1);
    }
    else {
        let line = manager.currentLine();
        let pos = manager.currentColumn();
        if (line[pos - 1] === '$') {
            manager.insert('{}');
            manager.move(-1);
            event.preventDefault();
        }
    }
}
function autoComplete(event) {
    let manager = new TextAreaManager();
    event.preventDefault();
    let line = manager.currentLine();
    let front = manager.currentLineFrontContent();
    if (line.trim().startsWith('【')) {
        line = line.replace('【', '[');
        manager.edit(manager.currentLineCount(), line);
    }
    if (line.trim().startsWith('[') && (line.search(']') === -1 || front.trim().endsWith(']')))
        completeTag(event);
    else {
        completeCharaterName(event);
        completeJump(event);
        completeSymbol(event);
        completeImageType(event);
        completeTransformType(event);
    }
}
function completeImageType(_) {
    let manager = new TextAreaManager();
    let front = manager.currentLineFrontContent();
    if (!['[Image]', '[Transform]'].some(tag => front.trim().startsWith(tag))
        || front.search(':') !== -1) return;
    let typePart = front.substring(front.search(/\]/) + 1).trim();
    let type = imageTypeCompleter.complete(typePart, !imageTypeCompleter.list.includes(typePart));
    if (type !== undefined) manager.insert(type, typePart.length);
}
function completeTransformType(_) {
    let manager = new TextAreaManager();
    let front = manager.currentLineFrontContent();
    if (!front.trim().startsWith('[Transform]')
        || front.replaceAll(/=.*?,/g, '').includes('=')) return;
    let typePart = front.substring(Math.max(front.indexOf(':'),
        front.lastIndexOf(',')) + 1).replace('[Transform]', '').trim();
    let type = transformTypeCompleter.complete(typePart, !transformTypeCompleter.list.includes(typePart));
    if (type !== undefined) manager.insert(type, typePart.length);
}
function completeCharaterName(_) {
    characters.list = characterScanner.scanList();
    let manager = new TextAreaManager();
    let line = manager.currentLine();
    let colonPos = line.search(':');
    if (colonPos !== -1 && colonPos !== line.length - 1) return;
    if (line.trim().startsWith('[')) return;
    let namePart = line;
    let name = characters.complete(namePart, colonPos === -1);
    if (name !== undefined) manager.edit(manager.currentLineCount(), name + ':');
}
function completeTag(_) {
    let manager = new TextAreaManager();
    let line = manager.currentLine();
    let tag = tags.complete('[' + line.replaceAll('[', '').replaceAll(']', ''), line.search(']') === -1);
    if (tag !== undefined) manager.edit(manager.currentLineCount(), tag);
    if (['[Case]', '[Var]', '[Enum]', '[Image]', '[Transform]'].some(t => t === tag)) {
        manager.edit(manager.currentLineCount(), tag + ':');
        manager.move(-1);
    }
}
function completeJump(_) {
    let manager = new TextAreaManager();
    let line = manager.currentLine();
    if (!line.trim().startsWith('[Jump]')) return;
    let anchors = anchorScanner.scanList();
    anchorCompleter.list = anchors;
    let anchorPart = line.replace('[Jump]', '').trim();
    let anchor = anchorCompleter.complete(anchorPart, !anchors.includes(anchorPart));
    if (anchor !== undefined) manager.edit(manager.currentLineCount(), '[Jump] ' + anchor);
}
function getBuiltins() {
    let frame = new vars.GalVars();
    frame.initBuiltins();
    return Object.keys(frame.builtins);
}
function completeSymbol(_) {
    let manager = new TextAreaManager();
    if (!needSymbol()) return;
    let symbols = scanSymbols().concat(getBuiltins());
    symbolCompleter.list = symbols;
    let symbolPart = manager.currentLineFrontContent().replaceAll('${', ' ').split(/\s/).at(-1);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbolPart)) return;
    let symbol = symbolCompleter.complete(symbolPart, !symbols.includes(symbolPart));
    if (symbol !== undefined) manager.insert(symbol, symbolPart.length);
}
function needSymbol() {
    let manager = new TextAreaManager();
    let isVar = /^\[Var\].*?\:/.test(manager.currentLineFrontContent().trim());
    let isSwitch = manager.currentLineFrontContent().trim().startsWith('[Switch]');
    let leftInterpolate = manager.currentLineFrontContent().replaceAll(/\$\{.*?\}/g, '').includes('${');
    let rightInterpolate = manager.currentLineBackContent().replaceAll(/\$\{.*?\}/g, '').includes('}');
    return isVar || isSwitch || (leftInterpolate && rightInterpolate);
}
function scanSymbols() {
    let manager = new TextAreaManager();
    let paragraph = new parser.Paragraph(manager.lines);
    let dataList = paragraph.dataList;
    let varList = dataList.filter(data => data.type === 'var').map(data => data.name);
    let enumList = paragraph.scanEnums();
    let enumTypes = enumList.map(data => data.name);
    let enumValues = enumList.map(data => data.values).flat();
    return [... new Set(varList.concat(enumTypes).concat(enumValues))]
        .filter(symbol => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(symbol));
} //Scans: var name; enum type; enum value;
function jumpTo(event) {
    if (!event.ctrlKey) return;
    let manager = new TextAreaManager();
    let front = manager.currentLineFrontContent();
    let line = manager.currentLine();
    if (front.search(':') === -1 && line.search(':') !== -1 && !line.trim().startsWith('[')) {
        let name = line.substring(0, line.search(':'));
        let pos = characterScanner.scanLine(name);
        if (pos !== -1) manager.jumpTo(pos);
    }
    else if (front.trim().startsWith('[Jump]')) {
        let anchor = line.replace('[Jump]', '').trim();
        let pos = anchorScanner.scanLine(anchor);
        if (pos !== -1) manager.jumpTo(pos);
    }
    else if (line.trim().startsWith('[End]')) {
        let index = manager.currentLineCount();
        let blocks = scanControlBlocks();
        for (let block of blocks) {
            if (block.endPos === index) {
                manager.jumpTo(block.startPos);
                return;
            }
        }
    }
    else if (line.trim().startsWith('[Case]')) {
        let index = manager.currentLineCount();
        let blocks = scanControlBlocks();
        for (let block of blocks) {
            if (block.casesPosList.some(i => i === index)) {
                manager.jumpTo(block.startPos);
                return;
            }
        }
    }
}
function comment(_) {
    let manager = new TextAreaManager();
    let start = manager.currentLineCount();
    let end = manager.currentEndLineCount();
    let lines = manager.lines.slice(start, end + 1);
    if (lines.every(line => line.trim().startsWith('//')))
        for (let [index, line] of lines.entries())
            lines[index] = line.replace('//', '').trim();
    else for (let [index, line] of lines.entries())
        lines[index] = '// ' + line;
    for (let [index, line] of lines.entries())
        manager.edit(start + index, line);
}
function scanControlBlocks() {
    let manager = new TextAreaManager();
    try {
        return new parser.Paragraph(manager.lines).getControlBlocks();
    } catch (err) {
        error.error(err);
    }
}
async function test(fileManager = file, content = textarea.value) {
    await file.autoSave();
    await ipcRenderer.invoke('test', { content: content, filename: fileManager.currentFile });
}
async function help(event) {
    event.preventDefault();
    let content = await ipcRenderer.invoke('readFile', 'example.txt').catch(_ => {
        error.error(`Cannot find example.txt`);
        success = false;
    });
    test(await new SaveLoadManager().ofFile('example.txt'), content);
}