import type { Configs, Environment, RuntimeAPI } from '../types.js';
import { switchMode } from '../mode.js';

function addStylesheet(url: string) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    document.head.appendChild(link);
}

export class Runtime {
    private constructor() { }
    static api: RuntimeAPI = undefined!;
    static configs: Configs = undefined!;
    static readonly environment: Environment = environment;
    static async initAPI() {
        await switchMode({
            electron: async () => {
                this.api = (await import('./api/electron.js')).ElectronAPI as any;
                window.lodash = require('lodash');
                window.highlight = require('highlight.js');
                addStylesheet('../font-awesome/css/all.min.css');
            },
            web: async () => {
                this.api = (await import('./api/web.js')).WebAPI as any;
                await import('https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.min.js' as any);
                window.lodash = (window as any)._;
                window.highlight = (await import('https://cdn.bootcdn.net/ajax/libs/'
                    + 'highlight.js/11.11.1/es/highlight.min.js' as any)).default;
                addStylesheet('https://cdn.bootcdn.net/ajax/libs/font-awesome/7.0.1/css/all.min.css');
            }
        });
    }
}

declare global {
    // This is set in HTML
    const environment: Environment;

    const lodash: any;
    const highlight: any;

    interface Window {
        lodash: any;
        highlight: any;
    }
}