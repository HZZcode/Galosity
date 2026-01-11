import { AutoBind } from './auto-bind.js';

export type LogType = 'log' | 'warn' | 'error';

@AutoBind
export abstract class AbstractLogger {
    private logs: string[] = [];
    
    abstract get isDebug(): boolean;

    get content() {
        return this.logs.join('\n');
    }

    fullString(object: any): string {
        if (Array.isArray(object))
            return '[' + object.map(this.fullString).join(', ') + ']';
        if (object instanceof Error) {
            if (object.cause === undefined) return object.stack!;
            return `${object.stack}\nCaused by: ${this.fullString(object.cause)}`;
        }
        return object.toString();
    }

    format(type: string, message: any) {
        return `[${type}] (${new Date().toUTCString()}) ${this.fullString(message)}`;
    }

    print(type: LogType, message: any) {
        message = this.format(type.toUpperCase(), message);
        this.logs.push(message);
        // eslint-disable-next-line no-console
        if (this.isDebug) console[type](message);
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