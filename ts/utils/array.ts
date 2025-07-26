import { Constructor, Func } from "./types.js";

export function findDuplicates<T>(array: T[]): T[] {
    return array.filter((item, index) => array.indexOf(item) !== index);
}

declare global {
    interface Array<T> {
        first(): T | undefined;

        filterType<U>(type: Constructor<U>): U[];

        findIndexOfType<U>(type: Constructor<U>, predicate: Func<[U], boolean>): number;

        all(): boolean;
        any(): boolean;

        mins(key?: (value: T) => number): T[];
        maxs(key?: (value: T) => number): T[];
    }
}

Array.prototype.first = function () {
    return this.at(0);
};

Array.prototype.filterType = function <U>(type: Constructor<U>): U[] {
    return this.filter((item: any) => item instanceof type);
};

Array.prototype.findIndexOfType = function <U>(type: Constructor<U>, predicate: Func<[U], boolean>) {
    return this.findIndex(value => value instanceof type && predicate(value));
};

Array.prototype.all = function () {
    return this.every(value => value);
};
Array.prototype.any = function () {
    return this.some(value => value);
};

Array.prototype.mins = function (key?: (value: any) => number) {
    key ??= value => value;
    const minKey = Math.min(...this.map(key));
    return this.filter(value => key(value) === minKey);
};
Array.prototype.maxs = function (key?: (value: any) => number) {
    key ??= value => value;
    const maxKey = Math.max(...this.map(key));
    return this.filter(value => key(value) === maxKey);
};

export function sum(nums: number[]) {
    return nums.reduce((x, y) => x + y, 0);
}

export function firstDifferents<T>(list1: T[], list2: T[]): [number, number] | undefined {
    for (let i = 0; i < list1.length; i++)
        if (list1[i] !== list2[i]) return [i, i];
}

export function lastDifferents<T>(list1: T[], list2: T[], min?: number): [number, number] | undefined {
    const d = list2.length - list1.length;
    for (let i = list1.length; i >= (min ?? 0); i--)
        if (list1[i] !== list2[i + d]) return [i, i + d];
    if (min !== undefined) return [min, min + d];
}