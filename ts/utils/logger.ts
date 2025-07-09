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
        message = message + '\n' + this.getStack();
        if (this.isDebug) console.warn(message);
    }
    error(message: any) {
        message = message + '\n' + this.getStack();
        if (this.isDebug) console.error(message);
    }
}

export const logger = new Logger();