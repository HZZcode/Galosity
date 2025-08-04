import { logger } from "./logger.js";

export function assert(condition: boolean, error: Error = new Error('Assertion failed')) {
    if (!condition) {
        logger.error(error);
        throw error;
    }
}