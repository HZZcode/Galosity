import { app, BrowserWindow, ipcMain, shell } from 'electron';

import type { Data, Environment } from '../../types.js';
import { filename } from '../arg-parser.js';
import { launch } from '../common.js';
import { configs } from '../configs.js';
import { handlers } from '../handlers.js';

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

function createWindow(environment: Environment, data: Data, parent?: BrowserWindow) {
    const window = new BrowserWindow({
        width: 1200,
        height: 800,
        parent,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    handlers.add(`${environment}-data`, () => data);
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
    editorWindow = createWindow('editor', { configs, filename });
}

function createEngineWindow(data: Data, parent?: BrowserWindow) {
    engineWindow = createWindow('engine', data, parent);
}

app.whenReady().then(async () => {
    if (await launch()) return;
    if (configs.edit) {
        createEditorWindow();
        handlers.add('engine', (data: Data) => createEngineWindow(data, editorWindow));
    }
    else createEngineWindow({ configs, filename });
    handlers.add('editorTitle', (title: string) => editorWindow?.setTitle(title));
    handlers.add('engineTitle', (title: string) => engineWindow?.setTitle(title));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});