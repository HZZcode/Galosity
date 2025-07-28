import { app, BrowserWindow, ipcMain, shell } from 'electron';
import type { EngineData } from '../types.js';
import { Handlers } from './handlers.js';
import { configs } from './configs.js';
import { Files } from './files.js';
import { argParser } from './arg-parser.js';

let editorWindow: BrowserWindow | undefined;
let engineWindow: BrowserWindow | undefined;

let filename: string | undefined;

function parseArgs() {
    try {
        // When unpackaged, `process.argv` is ['...electron...', '.', ...args]
        // When packaged, `process.argv` is ['...Galosity...', ...args]
        const args = process.argv.slice(configs.packed ? 1 : 2);
        filename = argParser.parseTo(args, configs).at(0);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        configs.help = true;
    }
    if (configs.isDebug) filename ??= 'gal.txt';
}

function handleLink(window: BrowserWindow) {
    window.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });
    window.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

function createWindow(file: string, dataChannel: string, data: any, parent?: BrowserWindow) {
    const window = new BrowserWindow({
        width: 1200,
        height: 800,
        parent,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    window.loadFile(file);
    window.webContents.on('did-finish-load', () => {
        window.webContents.send(dataChannel, data);
    });
    window.setMenu(null);
    if (configs.isDebug) window.webContents.openDevTools();
    handleLink(window);
    return window;
}

function createEditorWindow() {
    editorWindow = createWindow('./html/editor.html', 'send-data', { filename, configs });
    editorWindow.on('close', event => {
        event.preventDefault();
        editorWindow!.webContents.send('before-close');
        ipcMain.once('before-close-complete', () => editorWindow!.destroy());
    });
}

function createEngineWindow(parent: BrowserWindow | undefined, data: EngineData) {
    engineWindow = createWindow('./html/engine.html', 'engine-data', data, parent);
}

app.whenReady().then(async () => {
    parseArgs();
    if (configs.help) return argParser.printHelp();
    if (configs.edit) {
        createEditorWindow();
        Handlers.add('engine-data', (_, data: EngineData) => createEngineWindow(editorWindow, data));
    }
    else {
        const content = filename !== undefined ? await Files.read(filename) : '';
        createEngineWindow(undefined, { configs, content, filename });
    }
    Handlers.add('editorTitle', (_, title: string) => editorWindow?.setTitle(title));
    Handlers.add('engineTitle', (_, title: string) => engineWindow?.setTitle(title));
    Handlers.handle();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});