import { ErrorManager } from "./error-manager.js";
import { logger } from "./logger.js";

export const handleError = (error: ErrorManager, handle: boolean) =>
    <T extends any[], U>(f: (..._: T) => U) => handle ? (...args: T) => {
        error.clear();
        try {
            return f(...args);
        } catch (e) {
            logger.error(e);
            error.error(e);
        }
    } : f;
export const handleErrorAsWarning = (error: ErrorManager, handle: boolean) =>
    <T extends any[], U>(f: (..._: T) => U) => handle ? (...args: T) => {
        error.clear();
        try {
            return f(...args);
        } catch (e) {
            logger.warn(e);
            error.warn(e);
        }
    } : f;