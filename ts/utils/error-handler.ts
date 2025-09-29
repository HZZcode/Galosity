import type { ErrorManager } from "./error-manager.js";
import { logger } from "./logger.js";

export const handleError = (error: ErrorManager) =>
    <T extends any[], U>(f: (..._: T) => U) => (...args: T) => {
        error.clear();
        try {
            return f(...args);
        } catch (e) {
            logger.error(e);
            error.error(e);
        }
    };
export const handleErrorAsWarning = (error: ErrorManager) =>
    <T extends any[], U>(f: (..._: T) => U) => (...args: T) => {
        error.clear();
        try {
            return f(...args);
        } catch (e) {
            logger.warn(e);
            error.warn(e);
        }
    };