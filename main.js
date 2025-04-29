import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'fs';

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
    win.webContents.openDevTools();

    ipcMain.handle('showSaveDialog', async (event, options) =>
        dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), options));
    ipcMain.handle('showOpenDialog', async (event, options) =>
        dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), options));
    ipcMain.handle('writeFile', (_, path, content) => fs.promises.writeFile(path, content, 'utf-8'));
    ipcMain.handle('readFile', (_, path) => fs.promises.readFile(path, 'utf-8'));
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