/* eslint-disable no-console */

import type { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { Runtime } from "./configs.js";

type LogType = 'log' | 'warn' | 'error';

class Logger {
    private logs: string[] = [];

    get content() {
        return this.logs.join('\n');
    }

    getStack() {
        return new Error().stack!.split('\n').slice(3).join('\n');
    }

    fullString(object: any): string {
        if (object instanceof Error) return object.stack!;
        return object.toString();
    }

    format(type: string, message: any) {
        return `[${type}] (${new Date().toUTCString()}) ${this.fullString(message)}`;
    }

    print(type: LogType, message: any) {
        message = this.format(type.toUpperCase(), message);
        this.logs.push(message);
        if (Runtime.configs.isDebug) console[type](message);
    }

    async export() {
        const result = await ipcRenderer.invoke('showSaveDialog', {
            defaultPath: `Galosity-log${new Date().getTime()}.txt`
        });
        if (result.canceled) return;
        const path = result.filePath;
        await ipcRenderer.invoke('writeFile', path, this.content);
    }
    async copy() {
        await navigator.clipboard.writeText(this.content);
    }

    log(message: any) {
        this.print('log', message);
    }
    warn(message: any) {
        this.print('warn', message);
    }
    error(message: any) {
        this.print('error', message);
    }
}

export const logger = new Logger();