import { switchMode } from '../../mode.js';
import type { API, Data, DialogOptions, Environment } from '../../types.js';
import { forbidden } from '../../utils/assert.js';
import type { Func } from '../../utils/types.js';

type Renderer = API & {
    invoke(channel: 'requestSavePath', options: DialogOptions): Promise<string | undefined>;
    invoke(channel: 'requestOpenPath', options: DialogOptions): Promise<string | undefined>;
    invoke(channel: `${Environment}Title`, title: string): Promise<void>;
    invoke(channel: 'copy', text: string): Promise<void>;
    invoke(channel: 'openExternal', url: string): Promise<void>;
    invoke(channel: 'engine', data: Data): Promise<void>;
    invoke(channel: 'exit', code?: number | string): Promise<void>;
    invoke(channel: `${Environment}-data`): Promise<Data>;
    on(channel: 'before-close', handler: Func<[unknown], void>): void;
    send(channel: 'before-close-complete'): void;
};

class ElectronAPIClass {
    private constructor() { }
    private static cache?: Renderer;
    private static get ipcRenderer() {
        this.cache ??= require('electron').ipcRenderer;
        return this.cache!;
    }
    static async invoke(channel: string, ...args: any[]) {
        return await this.ipcRenderer.invoke(channel as any, ...args);
    }
    static async requestSavePath(options: DialogOptions) {
        return await this.ipcRenderer.invoke('requestSavePath', options);
    }
    static async requestOpenPath(options: DialogOptions) {
        return await this.ipcRenderer.invoke('requestOpenPath', options);
    }
    static async setTitle(environment: Environment, title: string) {
        await this.ipcRenderer.invoke(`${environment}Title`, title);
    }
    static async initData(environment: Environment) {
        return await this.ipcRenderer.invoke(`${environment}-data`);
    }
    static async copy(text: string) {
        await this.ipcRenderer.invoke('copy', text);
    }
    static async openExternal(url: string) {
        await this.ipcRenderer.invoke('openExternal', url);
    }
    static onClose(handler?: Func<[], void>) {
        this.ipcRenderer.on('before-close', async () => {
            await handler?.();
            this.ipcRenderer.send('before-close-complete');
        });
    }
    static async engine(data: Data) {
        await this.ipcRenderer.invoke('engine', data);
    }
    static async exit(code?: number | string) {
        await this.ipcRenderer.invoke('exit', code);
    }
}

export const ElectronAPI = switchMode({
    electron: () => ElectronAPIClass,
    web: () => forbidden('Cannot access Electron API under Web mode')
}) as typeof ElectronAPIClass;