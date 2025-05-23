import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

const isDebug = process.env.NODE_ENV === 'development';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
    ipcMain.handle('directory', _ => __dirname);
    ipcMain.handle('readdir', (_, path) => fs.promises.readdir(path));
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
        newWindow.loadURL('file://' + __dirname + '/test.html');
        newWindow.webContents.on('did-finish-load', () => {
            newWindow.webContents.send('send-data', data);
        });
        newWindow.setMenu(null);
        if (isDebug) newWindow.webContents.openDevTools();
    });
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