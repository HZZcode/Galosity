import { logger } from "./logger.js";

export function assert(condition: boolean, error: Error | string = 'Assertion failed') {
    if (typeof error === 'string') error = new Error(error);
    if (!condition) {
        logger.error(error);
        throw error;
    }
}

export function notUndefined<T>(value: T | undefined) {
    assert(value !== undefined, 'Invalid undefined');
    return value!;
}