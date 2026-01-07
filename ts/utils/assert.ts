import { logger } from "./logger.js";

export function assert(condition: boolean, error: Error | string = 'Assertion failed'): asserts condition {
    if (typeof error === 'string') error = new Error(error);
    if (!condition) {
        logger.error(error);
        throw error;
    }
}

export function notUndefined<T>(value: T | undefined, error: Error | string = 'Invalid undefined') {
    assert(value !== undefined, error);
    return value!;
}

export function wrapError(msg: string, cause: unknown): never {
    throw new Error(msg, { cause });
}