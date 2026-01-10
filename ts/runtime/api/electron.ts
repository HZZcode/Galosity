import type { OpenDialogOptions, SaveDialogOptions } from "electron";

import type { API, Data, Environment } from "../../types.js";
import type { Func } from "../../utils/types.js";

const ipcRenderer = require('electron').ipcRenderer as API & {
    invoke(channel: 'requestSavePath', options: SaveDialogOptions): Promise<string | undefined>;
    invoke(channel: 'requestOpenPath', options: OpenDialogOptions): Promise<string | undefined>;
    invoke(channel: `${Environment}Title`, title: string): Promise<void>;
    invoke(channel: 'copy', text: string): Promise<void>;
    invoke(channel: 'openExternal', url: string): Promise<void>;
    invoke(channel: 'engine', data: Data): Promise<void>;
    invoke(channel: 'exit', code?: number | string): Promise<void>;
    invoke(channel: `${Environment}-data`): Promise<Data>;
    on(channel: 'before-close', handler: Func<[unknown], void>): void;
    send(channel: 'before-close-complete'): void;
};

export class ElectronAPI {
    private constructor() { }
    static async invoke(channel: string, ...args: any[]) {
        return await ipcRenderer.invoke(channel as any, ...args);
    }
    static async requestSavePath(options: SaveDialogOptions) {
        return await ipcRenderer.invoke('requestSavePath', options);
    }
    static async requestOpenPath(options: OpenDialogOptions) {
        return await ipcRenderer.invoke('requestOpenPath', options);
    }
    static async setTitle(environment: Environment, title: string) {
        await ipcRenderer.invoke(`${environment}Title`, title);
    }
    static async initData(environment: Environment) {
        return await ipcRenderer.invoke(`${environment}-data`);
    }
    static async copy(text: string) {
        await ipcRenderer.invoke('copy', text);
    }
    static async openExternal(url: string) {
        await ipcRenderer.invoke('openExternal', url);
    }
    static onClose(handler?: Func<[], void>) {
        ipcRenderer.on('before-close', async () => {
            await handler?.();
            ipcRenderer.send('before-close-complete');
        });
    }
    static async engine(data: Data) {
        await ipcRenderer.invoke('engine', data);
    }
    static async exit(code?: number | string) {
        await ipcRenderer.invoke('exit', code);
    }
}