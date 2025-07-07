import { app, BrowserWindow, dialog, ipcMain, OpenDialogOptions, SaveDialogOptions, shell } from 'electron';
import { logger } from './utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const isDebug = logger.isDebug = process.env.NODE_ENV === 'development';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

function getArgvFileName() {
    for (const file of process.argv.slice(1))
        if (file !== '.' && fs.existsSync(file)) return file;
    return undefined;
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

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // @ts-expect-error This just works!
            enableRemoteModule: true,
        },
    });

    win.loadFile('index.html');

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('send-data', { isDebug: isDebug, file: getArgvFileName() });
    });

    win.on('close', event => {
        event.preventDefault();
        win.webContents.send('before-close');
        ipcMain.once('before-close-complete', () => win.destroy());
    });

    handleLink(win);
}

app.whenReady().then(() => {
    createWindow();

    const win = BrowserWindow.getAllWindows()[0];
    if (isDebug) win.webContents.openDevTools();

    ipcMain.handle('showSaveDialog', (event, options: SaveDialogOptions) =>
        dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender)!, options));
    ipcMain.handle('showOpenDialog', (event, options: OpenDialogOptions) =>
        dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender)!, options));
    ipcMain.handle('writeFile', (_, path: string, content: string) => 
        fs.promises.writeFile(path, content, 'utf-8'));
    ipcMain.handle('readFile', (_, path: string) => fs.promises.readFile(path, 'utf-8'));
    ipcMain.handle('resolve', (_, pathname: string) => path.resolve(pathname).replaceAll('\\', '/'));
    ipcMain.handle('hasFile', (_, path: string) => fs.promises.access(path, fs.constants.F_OK)
        .then(() => true).catch(() => false));
    ipcMain.handle('directory', _ => path.dirname(__dirname));
    ipcMain.handle('readdir', (_, path: string) => fs.promises.readdir(path));
    ipcMain.handle('openExternal', (_, url: string) => shell.openExternal(url));
    ipcMain.handle('test', (_, data: { content: string, filename: string, isDebug: boolean }) => {
        const newWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            parent: win,
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                // @ts-expect-error This just works!
                enableRemoteModule: true,
            },
        });
        newWindow.loadFile('test.html');
        newWindow.webContents.on('did-finish-load', () => {
            newWindow.webContents.send('test-data', data);
        });
        newWindow.setMenu(null);
        if (isDebug) newWindow.webContents.openDevTools();
        handleLink(newWindow);
    });
    // eslint-disable-next-line no-console
    ipcMain.handle('log', (_, str) => console.log(str));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});