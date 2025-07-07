import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import * as parser from '../parser/parser.js';
import * as dataTypes from '../parser/data-types.js';
import { logger } from '../utils/logger.js';
import { bindFunction } from "../utils/bind-events.js";
import { TagScanner } from "./tag-scanner.js";
import { FileManager } from "./file-manager.js";
import { error, getManager, scanControlBlocks, textarea, updateInfo } from "./elements.js";
import { file } from "./file-manager.js";
import { TabCompleters } from "./tab-completers.js";

const characterScanner = new TagScanner(getManager(), '[Character]');
const anchorScanner = new TagScanner(getManager(), '[Anchor]');
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
function completeBraces(event: Event) {
    const manager = getManager();
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
    const manager = getManager();
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
    const manager = getManager();
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
    const manager = getManager();
    event.preventDefault();
    let line = manager.currentLine();
    if (line.trim().startsWith('【')) {
        line = line.replace('【', '[');
        manager.edit(manager.currentLineCount(), line);
    }
    await TabCompleters.apply(getManager());
}
function scanFunctions() {
    return Object.fromEntries(
        new parser.Paragraph(getManager().lines).dataList
            .map((data, line): [dataTypes.GalData, number] => [data, line])
            .filter(entry => entry[0] instanceof dataTypes.FuncData)
            .map(entry => [(entry[0] as dataTypes.FuncData).name, entry[1]])
    );
}
async function jump(event: MouseEvent) {
    if (!event.ctrlKey) return;
    await jumpTo(event);
}
async function jumpTo(_?: Event) {
    const manager = getManager();
    const front = manager.currentLineFrontContent();
    const line = manager.currentLine();
    if (front.search(':') === -1 && line.search(':') !== -1 && !line.trim().startsWith('[')) {
        const name = line.substring(0, line.search(':'));
        const pos = characterScanner.scanLine(name);
        if (pos !== -1) manager.jumpTo(pos);
    }
    else if (front.trim().startsWith('[Jump]')) {
        const data = parser.parseLine(line) as dataTypes.JumpData;
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
        const blocks = scanControlBlocks() ?? [];
        for (const block of blocks) {
            if (block.endPos === index) {
                manager.jumpTo(block.startPos);
                return;
            }
        }
    }
    else if (line.trim().startsWith('[Case]')) {
        const index = manager.currentLineCount();
        const blocks = scanControlBlocks() ?? [];
        for (const block of blocks) {
            if (block.casesPosList.some(i => i === index)) {
                manager.jumpTo(block.startPos);
                return;
            }
        }
    }
    else if (front.trim().startsWith('[Call]')) {
        const name = (parser.parseLine(line) as dataTypes.CallData).name;
        const funcs = scanFunctions();
        if (name in funcs) {
            manager.jumpTo(funcs[name]);
            return;
        }
    }
    else if (front.trim().startsWith('[Import]')) {
        const path = (parser.parseLine(line) as dataTypes.ImportData).file;
        await file.openFile(path);
    }
}
function comment(_?: Event) {
    const manager = getManager();
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
    await file.readFile('example.txt')
        .then(async content => await test(await new FileManager().ofFile('example.txt'), content))
        .catch(e => {
            logger.error(e);
            error.error(`Cannot find example.txt`);
        });
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