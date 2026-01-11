import { AutoBind } from '../utils/auto-bind.js';
import { AbstractLogger } from '../utils/logger.js';
import { Runtime } from './runtime.js';

export type LogType = 'log' | 'warn' | 'error';

@AutoBind
class Logger extends AbstractLogger {
    override get isDebug() {
        return Runtime.configs.isDebug;
    }
    async export() {
        const path = await Runtime.api.requestSavePath({
            defaultPath: `Galosity-log${new Date().getTime()}.txt`
        });
        if (path === undefined) return;
        await Runtime.api.invoke('writeFile', path, this.content);
    }
    async copy() {
        await Runtime.api.copy(this.content);
    }
}

export const logger = new Logger();