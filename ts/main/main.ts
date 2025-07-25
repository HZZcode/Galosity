import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as fs from 'fs';
import { EngineData } from '../types.js';
import { Handlers } from './handlers.js';
import { configs } from './configs.js';
import { Files } from './files.js';

let editorWindow: BrowserWindow | undefined;
let engineWindow: BrowserWindow | undefined;

function getArgvFileName() {
    const filename = process.argv.slice(1).filter(file => file !== '.' && fs.existsSync(file)).at(0);
    if (configs.isDebug && filename === undefined) return 'gal.txt';
    return filename;
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

function createEditorWindow() {
    editorWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    editorWindow.loadFile('./html/editor.html');

    editorWindow.webContents.on('did-finish-load', () => {
        editorWindow!.webContents.send('send-data', { filename: getArgvFileName(), configs });
    });

    editorWindow.on('close', event => {
        event.preventDefault();
        editorWindow!.webContents.send('before-close');
        ipcMain.once('before-close-complete', () => editorWindow!.destroy());
    });

    editorWindow.setMenu(null);
    if (configs.isDebug) editorWindow.webContents.openDevTools();
    handleLink(editorWindow);
}

function createEngineWindow(parent: BrowserWindow | undefined, data: EngineData) {
    engineWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        parent: parent,
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    engineWindow.loadFile('./html/engine.html');

    engineWindow.webContents.on('did-finish-load', () => {
        engineWindow!.webContents.send('engine-data', data);
    });

    engineWindow.setMenu(null);
    if (configs.isDebug) engineWindow.webContents.openDevTools();
    handleLink(engineWindow);
}

app.whenReady().then(async () => {
    if (configs.edit) {
        createEditorWindow();
        Handlers.add('engine-data', (_, data: EngineData) => createEngineWindow(editorWindow!, data));
    }
    else {
        const filename = getArgvFileName();
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

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createEditorWindow();
});