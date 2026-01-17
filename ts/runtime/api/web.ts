import type { Data, Environment } from '../../types.js';
import { assert } from '../../utils/assert.js';
import type { Func } from '../../utils/types.js';

export class WebAPI {
    private constructor() { }
    static async invoke(channel: string, ...args: any[]) {
        return await (await fetch(`/api/${channel}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(args)
        })).json();
    }
    private static requestPath() {
        const name = prompt('Input text file name');
        if (name === null) return undefined;
        assert(['.', '/'].every(c => !name.includes(c)), 'Invalid file name!');
        return `web-files/${name}.txt`;
    }
    static requestSavePath() {
        return this.requestPath();
    }
    static requestOpenPath() {
        return this.requestPath();
    }
    static setTitle(_: Environment, title: string) {
        document.title = title;
    }
    static async initData(environment: Environment) {
        if (environment === 'editor') return await this.invoke('get-data');
        return JSON.parse(sessionStorage.getItem('galosity-data')!);
    }
    static async copy(text: string) {
        await navigator.clipboard.writeText(text);
    }
    static openExternal(url: string) {
        window.open(url, '_blank');
    }
    static onClose(handler?: Func<[], void>) {
        window.addEventListener('beforeunload', handler ?? (() => void 0));
    }
    static engine(data: Data) {
        sessionStorage.setItem('galosity-data', JSON.stringify(data));
        this.openExternal('/engine');
    }
    static exit() {
        // Does nothing. Users can close the tab on their own.
    }
}