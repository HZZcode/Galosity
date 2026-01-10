import type { API, Configs, Data, DialogOptions, Environment } from '../types.js';
import type { Func } from '../utils/types.js';

interface RuntimeAPI extends API {
    requestSavePath(options: DialogOptions): Promise<string | undefined>;
    requestOpenPath(options: DialogOptions): Promise<string | undefined>;
    setTitle(environment: Environment, title: string): Promise<void>;
    initData(environment: Environment): Promise<Data>;
    copy(text: string): Promise<void>;
    openExternal(url: string): Promise<void>;
    onClose(handler?: Func<[], void>): void;
    engine(data: Data): Promise<void>;
    exit(code?: number | string): Promise<void>;
}

export class Runtime {
    private constructor() { }
    static api: RuntimeAPI = undefined!;
    static configs: Configs = undefined!;
    static readonly environment: Environment = environment;
    static async initAPI() {
        this.api = (await import('./api/electron.js')).ElectronAPI as any;
    }
}

declare global {
    // This is set in HTML
    const environment: Environment;
}