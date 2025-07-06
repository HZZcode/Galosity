/* eslint-disable no-console */

class Logger {
    isDebug = true;

    getStack() {
        return new Error().stack!.split('\n').slice(3).join('\n');
    }

    log(message: any) {
        if (this.isDebug) console.log(message);
    }
    warn(message: any) {
        if (this.isDebug) console.warn(message + '\n' + this.getStack());
    }
    error(message: any) {
        if (this.isDebug) console.error(message + '\n' + this.getStack());
    }
}

export const logger = new Logger();