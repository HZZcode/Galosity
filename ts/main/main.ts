import { app, BrowserWindow, ipcMain, shell } from 'electron';

import type { Data, Environment } from '../types.js';
import { argParser } from './arg-parser.js';
import { configs } from './configs.js';
import { Crypto } from './crypto.js';
import { Handlers } from './handlers.js';

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
    if (!configs.packed) filename ??= 'gal.txt';
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

function createWindow(environment: Environment, data: any, parent?: BrowserWindow) {
    const window = new BrowserWindow({
        width: 1200,
        height: 800,
        parent,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    Handlers.doHandle(`${environment}-data`, () => data);
    window.loadFile(`./html/${environment}.html`);
    window.setMenu(null);
    if (configs.isDebug) window.webContents.openDevTools();
    handleLink(window);
    window.on('close', event => {
        event.preventDefault();
        window.webContents.send('before-close');
        ipcMain.once('before-close-complete', () => window.destroy());
    });
    return window;
}

function createEditorWindow() {
    editorWindow = createWindow('editor', { filename, configs });
}

function createEngineWindow(data: Data, parent?: BrowserWindow) {
    engineWindow = createWindow('engine', data, parent);
}

app.whenReady().then(async () => {
    parseArgs();
    if (configs.help) return argParser.printHelp();
    if (configs.encrypt) {
        if (filename === undefined)
            throw new Error('Encrypt needs input file');
        return await Crypto.encrypt(filename);
    }
    if (configs.edit) {
        createEditorWindow();
        Handlers.add('engine', (_, data: Data) => createEngineWindow(data, editorWindow));
    }
    else createEngineWindow({ configs, filename });
    Handlers.add('editorTitle', (_, title: string) => editorWindow?.setTitle(title));
    Handlers.add('engineTitle', (_, title: string) => engineWindow?.setTitle(title));
    Handlers.handle();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});