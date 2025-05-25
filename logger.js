/* eslint-disable no-console */

class Logger {
    isDebug = true;

    log(message) {
        if (this.isDebug) console.log(message);
    }

    warn(message) {
        if (this.isDebug) console.warn(message);
    }

    error(message) {
        if (this.isDebug) console.error(message);
    }
}

export const logger = new Logger();