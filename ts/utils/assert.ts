import { logger } from "./logger.js";

export function assert(condition: boolean, message = 'Assertion failed') {
    if (!condition) {
        logger.error(message);
        throw message;
    }
}