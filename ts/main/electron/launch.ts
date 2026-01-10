import { app, BrowserWindow, ipcMain, shell } from 'electron';

import type { Data, Environment } from '../../types.js';
import { argParser, filename, parseArgs } from '../arg-parser.js';
import { configs } from '../configs.js';
import { Crypto } from '../crypto.js';
import { Handlers } from '../handlers.js';

let editorWindow: BrowserWindow | undefined;
let engineWindow: BrowserWindow | undefined;

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
    Handlers.add(`${environment}-data`, () => data);
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
        Handlers.add('engine', (data: Data) => createEngineWindow(data, editorWindow));
    }
    else createEngineWindow({ configs, filename });
    Handlers.add('editorTitle', (title: string) => editorWindow?.setTitle(title));
    Handlers.add('engineTitle', (title: string) => engineWindow?.setTitle(title));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});