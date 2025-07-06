export function assert(condition: boolean, message = 'Assertion failed') {
    if (!condition) throw message;
}