import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';

const isDebug = logger.isDebug = process.env.NODE_ENV === 'development';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

function getArgvFileName() {
    for (const file of process.argv.slice(1))
        if (file !== '.' && fs.existsSync(file)) return file;
    return null;
}

function handleLink(window) {
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

    ipcMain.handle('showSaveDialog', (event, options) =>
        dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), options));
    ipcMain.handle('showOpenDialog', (event, options) =>
        dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), options));
    ipcMain.handle('writeFile', (_, path, content) => fs.promises.writeFile(path, content, 'utf-8'));
    ipcMain.handle('readFile', (_, path) => fs.promises.readFile(path, 'utf-8'));
    ipcMain.handle('resolve', (_, pathname) => path.resolve(pathname).replaceAll('\\', '/'));
    ipcMain.handle('hasFile', (_, path) => fs.promises.access(path, fs.constants.F_OK)
        .then(() => true).catch(() => false));
    ipcMain.handle('directory', _ => __dirname);
    ipcMain.handle('readdir', (_, path) => fs.promises.readdir(path));
    ipcMain.handle('openExternal', (_, url) => shell.openExternal(url));
    ipcMain.handle('test', (_, data) => {
        const newWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            parent: win,
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
            },
        });
        newWindow.loadFile('test.html');
        newWindow.webContents.on('did-finish-load', () => {
            newWindow.webContents.send('send-data', data);
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