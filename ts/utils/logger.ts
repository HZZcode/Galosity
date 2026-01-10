/* eslint-disable no-console */

import { AutoBind } from "./auto-bind.js";
import { Runtime } from "./runtime.js";

type LogType = 'log' | 'warn' | 'error';

@AutoBind
class Logger {
    private logs: string[] = [];

    get content() {
        return this.logs.join('\n');
    }

    fullString(object: any): string {
        if (object instanceof Error) {
            if (object.cause === undefined) return object.stack!;
            return `${object.stack}\nCaused by: ${object.cause}`;
        }
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
        const path = await Runtime.api.invoke('requestSavePath', {
            defaultPath: `Galosity-log${new Date().getTime()}.txt`
        });
        if (path === undefined) return;
        await Runtime.api.invoke('writeFile', path, this.content);
    }
    async copy() {
        await Runtime.api.invoke('copy', this.content);
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