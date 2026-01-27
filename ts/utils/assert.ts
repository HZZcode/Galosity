type ErrorLike = Error | string;
const toError = (error: ErrorLike) => typeof error === 'string' ? new Error(error) : error;

export function assert(condition: boolean, error: ErrorLike 
    = 'Assertion failed', cause?: unknown): asserts condition {
    error = toError(error);
    error.cause = cause;
    if (!condition) throw error;
}

export function notUndefined<T>(value: T | undefined, error: ErrorLike = 'Invalid undefined') {
    assert(value !== undefined, error);
    return value;
}

export const forbidden = (error: ErrorLike) => new Proxy({}, {
    get() {
        throw toError(error);
    }
});