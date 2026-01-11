import { switchMode } from '../mode.js';
import type { Configs, Environment, RuntimeAPI } from '../types.js';

export class Runtime {
    private constructor() { }
    static api: RuntimeAPI = undefined!;
    static configs: Configs = undefined!;
    static readonly environment: Environment = environment;
    static async initAPI() {
        await switchMode({
            electron: async () => {
                this.api = (await import('./api/electron.js')).ElectronAPI as any;
            },
            web: async () => {
                this.api = (await import('./api/web.js')).WebAPI as any;
            }
        });
    }
}

declare global {
    // This is set in HTML
    const environment: Environment;

    const _: {
        clone: <T>(object: T) => T;
        cloneDeep: <T>(object: T) => T;
    };
    const hljs: {
        highlight: (code: string, options: { language: string }) => { value: string };
    };
}