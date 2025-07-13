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
import { KeybindManager, KeyConfig, KeyType } from "../utils/keybind.js";
import { surround } from "./surround.js";
import { loadPlugins } from "../plugin/loader.js";
import { themes } from "../utils/color-theme.js";

const keybind = new KeybindManager();

function binds() {
    textarea.addEventListener('keydown', processKeyDown);
    textarea.addEventListener('input', updateInfo);
    textarea.addEventListener('selectionchange', updateInfo);

    setInterval(async () => await file.autoSave(), 60000);

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

    keybind.bind(KeyType.of('n', KeyConfig.Ctrl), file.new.bind(file));
    keybind.bind(KeyType.of('o', KeyConfig.Ctrl), file.open.bind(file));
    keybind.bind(KeyType.of('s', KeyConfig.Ctrl), file.save.bind(file));
    keybind.bind(KeyType.of('s', KeyConfig.Ctrl | KeyConfig.Shift), file.saveAs.bind(file));
    keybind.bind(KeyType.of('h', KeyConfig.Ctrl), help);

    keybind.bind(KeyType.of('Tab'), autoComplete);
    keybind.bind(KeyType.of('/', KeyConfig.Ctrl), comment);
    textarea.addEventListener('mouseup', jump);
    keybind.bind(KeyType.of('b', KeyConfig.Ctrl), file.back.bind(file));
    keybind.bind(KeyType.of('F5'), test);

    keybind.bind(KeyType.of('('), surround('(', ')'));
    keybind.bind(KeyType.of('{'), surround('{', '}'));
    keybind.bind(KeyType.of('l', KeyConfig.Ctrl), surround('\\(', '\\)'));
    keybind.bind(KeyType.of('l', KeyConfig.Ctrl | KeyConfig.Shift), surround('$$', '$$'));
    keybind.bind(KeyType.of('t', KeyConfig.Alt), themes.next.bind(themes));
}

async function processKeyDown(event: KeyboardEvent) {
    if (await keybind.apply(event)) event.preventDefault();
}

async function autoComplete() {
    const manager = getManager();
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

function comment() {
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
    await ipcRenderer.invoke('editor-data', {
        content: content,
        filename: fileManager.filename,
        isDebug: logger.isDebug,
        theme: themes.current
    });
}
async function help() {
    await file.readFile('example.txt')
        .then(async content => await test(await new FileManager().ofFile('example.txt'), content))
        .catch(e => {
            logger.error(e);
            error.error(`Cannot find example.txt`);
        });
}

ipcRenderer.on('before-close', async () => {
    await file.save();
    ipcRenderer.send('before-close-complete');
});

const initPromise = new Promise<void>((resolve, reject) => {
    ipcRenderer.on('send-data', async (_, data) => {
        try {
            logger.isDebug = data.isDebug;
            await loadPlugins(e => {
                logger.error(e);
                error.error(e);
            });
            if (data.file !== undefined) await file.read(data.file);
            else if (data.isDebug) await file.read('gal.txt');
            updateInfo();

            themes.set();
            binds();
            resolve();
        } catch (e) {
            reject(e);
        }
    });
});

async function main() {
    await initPromise;
}

// eslint-disable-next-line floatingPromise/no-floating-promise
main();