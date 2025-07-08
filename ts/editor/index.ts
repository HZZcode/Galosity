import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { logger } from '../utils/logger.js';
import { bindFunction } from "../utils/bind-events.js";
import { FileManager } from "./file-manager.js";
import { error, getManager, textarea, updateInfo } from "./elements.js";
import { file } from "./file-manager.js";
import { TabCompleters } from "./tab-completers.js";
import { Jumpers } from "./jumpers.js";

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
async function jump(event: MouseEvent) {
    if (!event.ctrlKey) return;
    await jumpTo();
}
async function jumpTo() {
    await Jumpers.apply(getManager());
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
    if (data.file !== undefined) await file.read(data.file);
    else if (data.isDebug) await file.read('gal.txt');
});

ipcRenderer.on('before-close', async () => {
    await file.save();
    ipcRenderer.send('before-close-complete');
});