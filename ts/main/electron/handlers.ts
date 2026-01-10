import { clipboard, dialog, ipcMain, shell } from 'electron';

import type { DialogOptions } from '../../types.js';

type Listener = (...args: any[]) => any;
export class ElectronHandlers {
    private constructor() { }

    static add(channel: string, listener: Listener) {
        ipcMain.removeHandler(channel);
        ipcMain.handle(channel, (_, ...args) => listener(...args));
    }
}
ElectronHandlers.add('requestSavePath', async (options: DialogOptions) => {
    const result = await dialog.showSaveDialog(options);
    return result.canceled ? undefined : result.filePath;
});
ElectronHandlers.add('requestOpenPath', async (options: DialogOptions) => {
    const result = await dialog.showOpenDialog(options);
    return result.canceled ? undefined : result.filePaths[0];
});
ElectronHandlers.add('openExternal', (url: string) => shell.openExternal(url));
ElectronHandlers.add('copy', (text: string) => clipboard.writeText(text));
ElectronHandlers.add('exit', (code?: number | string) => process.exit(code));