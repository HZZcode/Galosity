import {
    BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent,
    OpenDialogOptions, SaveDialogOptions, shell
} from 'electron';
import { Files } from './files.js';

type Listener = (event: IpcMainInvokeEvent, ...args: any[]) => any;
export class Handlers {
    private constructor() { }

    static handlers: { [channel: string]: Listener } = {};

    static handle() {
        for (const [channel, listener] of Object.entries(this.handlers))
            ipcMain.handle(channel, listener);
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
Handlers.add('readFile', (_, pathname: string) => Files.read(pathname));
Handlers.add('resolve', (_, pathname: string) => Files.resolve(pathname));
Handlers.add('directory', _ => Files.directory);
Handlers.add('readdir', (_, pathname: string, withFileTypes: boolean = false) =>
    Files.readDir(pathname, withFileTypes));
Handlers.add('exists', (_, pathname: string) => Files.exists(pathname));
Handlers.add('delete', (_, pathname: string) => Files.delete(pathname));

Handlers.add('openExternal', (_, url: string) => shell.openExternal(url));

// eslint-disable-next-line no-console
Handlers.add('log', (_, str: any) => console.log(str));

Handlers.add('exit', (_, code?: number | string) => process.exit(code));