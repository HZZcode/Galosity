import type { IpcMainInvokeEvent, OpenDialogOptions, SaveDialogOptions } from 'electron';
import { BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron';

import type { HandlerRegistry } from '../types.js';
import { Crypto } from './crypto.js';
import { Files } from './files.js';

type Listener = (event: IpcMainInvokeEvent, ...args: any[]) => any;
export class Handlers {
    private constructor() { }

    static handlers: Record<string, Listener> = {};

    static doHandle(channel: string, listener: Listener) {
        ipcMain.removeHandler(channel);
        ipcMain.handle(channel, listener);
    }

    static handle() {
        for (const [channel, listener] of Object.entries(this.handlers))
            this.doHandle(channel, listener);
    }

    static add(channel: string, listener: Listener) {
        this.handlers[channel] = listener;
    }
}

Handlers.add('showSaveDialog', (event, options: SaveDialogOptions) =>
    dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender)!, options));
Handlers.add('showOpenDialog', (event, options: OpenDialogOptions) =>
    dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender)!, options));

Handlers.add('writeFile', (_, pathname: string, content: string) => Files.write(pathname, content));
Handlers.add('writeFileEncrypted', (_, pathname: string, content: string) =>
    Crypto.writeEncrypted(pathname, content));
Handlers.add('readFile', (_, pathname: string) => Files.read(pathname));
Handlers.add('readFileDecrypted', (_, pathname: string) => Crypto.readDecrypted(pathname));
Handlers.add('resolve', (_, pathname: string, directory?: string) => Files.resolve(pathname, directory));
Handlers.add('directory', _ => Files.directory);
Handlers.add('readdir', (_, pathname: string, withFileTypes = false) =>
    Files.readDir(pathname, withFileTypes));
Handlers.add('exists', (_, pathname: string) => Files.exists(pathname));
Handlers.add('delete', (_, pathname: string) => Files.delete(pathname));

Handlers.add('openExternal', (_, url: string) => shell.openExternal(url));

Handlers.add('copy', (_, text: string) => clipboard.writeText(text));

Handlers.add('exit', (_, code?: number | string) => process.exit(code));

Handlers.add('add-handler', (_, registry: HandlerRegistry) =>
    Handlers.doHandle(registry.channel, (_, ...args: any[]) =>
        new Function(...registry.args, registry.code)(...args)));