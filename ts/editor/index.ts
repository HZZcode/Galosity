import { Configs, GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import "../utils/uncaught-errors.js";

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
import { editTag } from "./history.js";
import { recordInput } from "./input-record.js";
import { Func } from "../utils/types.js";
import { isConfirming } from "../utils/confirm.js";
import { SearchScreen } from "./search-replace.js";

const keybind = new KeybindManager();
const textKeybind = new KeybindManager();

let configs: Configs;

const bindFunctions = (id: string, key: KeyType, func: Func<[], void>) => {
    bindFunction(id, func);
    keybind.bind(key, func);
};

const bindTextFunctions = (id: string, key: KeyType, func: Func<[], void>) => {
    bindFunction(id, func);
    textKeybind.bind(key, func);
};

function binds() {
    document.addEventListener('keydown', processKeyDown);
    textarea.addEventListener('input', update);
    textarea.addEventListener('selectionchange', update);

    setInterval(async () => await file.autoSave(), 60000);

    bindFunctions('new', KeyType.of('n', KeyConfig.Ctrl), file.new.bind(file));
    bindFunctions('open', KeyType.of('o', KeyConfig.Ctrl), file.open.bind(file));
    bindFunctions('save', KeyType.of('s', KeyConfig.Ctrl), file.save.bind(file));
    bindFunctions('save-as', KeyType.of('s', KeyConfig.Ctrl | KeyConfig.Shift), file.saveAs.bind(file));
    bindFunctions('test', KeyType.of('F5'), test);
    bindFunctions('help', KeyType.of('h', KeyConfig.Ctrl), help);

    bindTextFunctions('undo', KeyType.of('z', KeyConfig.Ctrl), () => getManager().undo());
    bindTextFunctions('redo', KeyType.of('y', KeyConfig.Ctrl), () => getManager().redo());
    bindTextFunctions('tab', KeyType.of('Tab'), autoComplete);
    bindTextFunctions('searcher', KeyType.of('f', KeyConfig.Ctrl), () => SearchScreen.show());
    bindFunction('jump', jumpTo); textarea.addEventListener('mouseup', jump);
    bindTextFunctions('back', KeyType.of('b', KeyConfig.Ctrl), file.back.bind(file));

    textKeybind.bind(KeyType.of('/', KeyConfig.Ctrl), comment);
    textKeybind.bind(KeyType.of('('), surround('(', ')'));
    textKeybind.bind(KeyType.of('{'), surround('{', '}'));
    textKeybind.bind(KeyType.of('l', KeyConfig.Ctrl), surround('\\(', '\\)'));
    textKeybind.bind(KeyType.of('l', KeyConfig.Ctrl | KeyConfig.Shift), surround('$$', '$$'));
    keybind.bind(KeyType.of('t', KeyConfig.Alt), themes.next.bind(themes));
}

function update(event?: Event) {
    if (event instanceof InputEvent) recordInput();
    updateInfo();
}

async function processKeyDown(event: KeyboardEvent) {
    if (isConfirming) return;
    else if (event.target instanceof HTMLTextAreaElement
        && await textKeybind.apply(event)) event.preventDefault();
    else if (await keybind.apply(event)) event.preventDefault();
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
    const tag = editTag();
    for (const [index, line] of lines.entries())
        manager.edit(start + index, line, true, tag);
}

async function test(fileManager = file, content = textarea.value) {
    await file.autoSave();
    await ipcRenderer.invoke('engine-data', {
        content,
        filename: fileManager.filename,
        configs
    });
}
async function help() {
    const tutorial = 'tutorial/main.txt';
    await file.readFile(tutorial)
        .then(async content => await test(await new FileManager().ofFile(tutorial), content))
        .catch(e => {
            logger.error(e);
            error.error(`Cannot find ${tutorial}`);
        });
}

ipcRenderer.on('before-close', async () => {
    await file.save();
    ipcRenderer.send('before-close-complete');
});

const initPromise = new Promise<void>((resolve, reject) => {
    ipcRenderer.on('send-data', async (_, data) => {
        try {
            configs = data.configs;
            logger.isDebug = configs.isDebug;
            await loadPlugins(e => {
                logger.error(e);
                error.error(e);
            });
            if (data.filename !== undefined)
                await file.read(data.filename);
            update();
            recordInput();
            themes.set(configs.theme);
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