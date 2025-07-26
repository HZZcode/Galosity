export function isIdentifier(str: string) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}
export function isDiscarded(str: string) {
    return /^_+$/.test(str);
}
export function isNum(value: string) {
    return Number.isFinite(Number(value)) && value !== '';
}

export type SlicePos = [number, number];

export type Searchable = string | RegExp;

declare global {
    interface String {
        splitLine(): string[];

        toIdentifier(): string;

        toRegex(flags?: string): RegExp;

        searchPos(sub: Searchable, startPos?: number): SlicePos | undefined;
        searchAllPos(sub: Searchable, startPos?: number): Generator<SlicePos>;

        replacePos(pos: SlicePos, str: string): string;
        /**
         * Here we assume that `pos` are sorted and do not intersect.
         */
        replaceAllPos(pos: SlicePos[], str: string): string;
    }
}

String.prototype.splitLine = function () {
    return this.split(/\r?\n/);
};

String.prototype.toRegex = function (flags?: string) {
    return new RegExp(this.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
};

String.prototype.toIdentifier = function () {
    const parts = this.split('-');
    return parts[0] + parts.slice(1).map(part => part[0].toUpperCase() + part.slice(1)).join('');
};

String.prototype.searchPos = function (sub: Searchable, startPos: number = 0) {
    if (typeof sub === 'string')
        return this.searchPos(sub.toRegex('g'), startPos);
    sub.lastIndex = startPos;
    const match = sub.exec(this.valueOf());
    if (match !== null) return [match.index, match.index + match[0].length];
};

String.prototype.searchAllPos = function* (sub: Searchable, startPos?: number) {
    let result: [number, number] | undefined;
    while ((result = this.searchPos(sub, startPos)) !== undefined) {
        yield result;
        startPos = result[1];
    }
};

String.prototype.replacePos = function (pos: SlicePos, str: string) {
    return this.replaceAllPos([pos], str);
};

String.prototype.replaceAllPos = function (pos: SlicePos[], str: string) {
    if (pos.length === 0) return this.valueOf();
    let result = this.substring(0, pos[0][0]);
    for (let i = 0; i < pos.length - 1; i++) {
        result += str;
        result += this.substring(pos[i][1], pos[i + 1][0]);
    }
    result += str;
    result += this.substring(pos.at(-1)![1]);
    return result;
};