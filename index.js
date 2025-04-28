"use strict";
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
    currentColumn() {
        return this.currentLineFrontContent().length;
    }
    currentLine() {
        return this.lines[this.currentLineCount()];
    }
    currentLineFrontContent() {
        return this.content.substring(0, this.start).split(/\r?\n/)[this.currentLineCount()];
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
const info = document.getElementById('info');
const error = new ErrorManager();
let characters = new AutoComplete();
let tags = new AutoComplete(['[Character]', '[Jump]', '[Anchor]', '[Select]', '[Switch]', '[Case]', '[End]']);
let anchorCompleter = new AutoComplete();
let characterScanner = new TagScanner('[Character]');
let anchorScanner = new TagScanner('[Anchor]');
textarea.addEventListener('keydown', processKeyDown);
textarea.addEventListener('mouseup', jumpTo);
textarea.addEventListener('input', updateInfo);
textarea.addEventListener('selectionchange', updateInfo);
function updateInfo(_) {
    error.clear();
    let manager = new TextAreaManager();
    info.innerText = `Line ${manager.currentLineCount()}, Column ${manager.currentColumn()}`;
    scanControlBlocks();
}
function processKeyDown(event) {
    let key = event.key;
    characters.list = characterScanner.scanList();
    if (key === 'Tab')
        autoComplete(event);
    if (event.ctrlKey && key === '/')
        comment(event);
}
function autoComplete(event) {
    let manager = new TextAreaManager();
    event.preventDefault();
    let line = manager.currentLine();
    let front = manager.currentLineFrontContent();
    if (line.startsWith('[') && (line.search(']') == -1 || front.trim().endsWith(']')))
        completeTag(event);
    else {
        completeCharaterName(event);
        completeJump(event);
    }
}
function completeCharaterName(_) {
    let manager = new TextAreaManager();
    let line = manager.currentLine();
    let colonPos = line.search(':');
    if (colonPos !== -1 && colonPos !== line.length - 1) return;
    let namePart = line;
    let name = characters.complete(namePart, colonPos === -1);
    if (name != undefined) manager.edit(manager.currentLineCount(), name + ':');
}
function completeTag(_) {
    let manager = new TextAreaManager();
    let line = manager.currentLine();
    let tag = tags.complete('[' + line.replaceAll('[', '').replaceAll(']', ''), line.search(']') === -1);
    if (tag !== undefined) manager.edit(manager.currentLineCount(), tag);
    if (tag === '[Case]') {
        manager.edit(manager.currentLineCount(), tag + ':');
        textarea.selectionStart--;
        textarea.selectionEnd--;
    }
}
function completeJump(_) {
    let manager = new TextAreaManager();
    let line = manager.currentLine();
    if (!line.startsWith('[Jump]')) return;
    let anchors = anchorScanner.scanList();
    anchorCompleter.list = anchors;
    let anchorPart = line.replace('[Jump]', '').trim();
    let anchor = anchorCompleter.complete(anchorPart, !anchors.includes(anchorPart));
    if (anchor != undefined) manager.edit(manager.currentLineCount(), '[Jump] ' + anchor);
}
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
    let line = manager.currentLine();
    if (line.trim().startsWith('//'))
        line = line.replace('//', '').trim();
    else line = '// ' + line;
    manager.edit(manager.currentLineCount(), line);
}
class ControlBlock {
    startPos;
    casesPosList;
    endPos;
    constructor(startPos, casesPosList, endPos) {
        this.startPos = startPos;
        this.casesPosList = casesPosList;
        this.endPos = endPos;
    }
}
function scanControlBlocks() {
    let manager = new TextAreaManager();
    let controlTags = ['[Select]', '[Switch]'];
    let isControlTag = line => controlTags.some(value => line.startsWith(value));
    let ans = [];
    let stack = [];
    for (let [index, line] of manager.lines.entries()) {
        if (isControlTag(line)) {
            stack.push(new ControlBlock(index, [], -1));
        }
        if (line.startsWith('[Case]')) {
            if (stack.length === 0)
                error.error(`Error: [Case] tag out of control block at line ${index}`);
            else {
                stack[stack.length - 1].casesPosList.push(index);
            }
        }
        if (line.startsWith('[End]')) {
            if (stack.length === 0)
                error.error(`Error: Extra [End] found at line ${index}`);
            else {
                let block = stack.pop();
                block.endPos = index;
                ans.push(block);
            }
        }
    }
    error.assert(stack.length === 0, `Error: Control Block ([Select]-[End] or [Switch]-[End]) not closed`);
    return ans;
}