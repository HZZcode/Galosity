export function isIdentifier(str: string) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}
export function isDiscarded(str: string) {
    return /^_+$/.test(str);
}
export function isNum(value: string) {
    return Number.isFinite(Number(value)) && value !== '';
}

declare global {
    interface String {
        splitLine(): string[];
    }
}

String.prototype.splitLine = function () {
    return this.split(/\r?\n/);
};