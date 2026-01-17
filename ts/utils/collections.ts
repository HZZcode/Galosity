import type { IntoType, TypeFilter } from './types.js';
import { typeFilter } from './types.js';

export function findDuplicates<T>(array: T[]): T[] {
    return array.filter((item, index) => array.indexOf(item) !== index);
}

declare global {
    interface Array<T> {
        first(): T | undefined;

        filterType<F extends TypeFilter>(type: F): IntoType<F>[];

        findIndexOfType<F extends TypeFilter>(type: F, predicate: (_: IntoType<F>) => boolean): number;

        all(): boolean;
        any(): boolean;

        mins(key?: (value: T) => number): T[];
        maxs(key?: (value: T) => number): T[];

        repeat(count: number): T[];

        pushAndReturn(value: T): T;

        unique(): T[];

        asyncMap<U>(func: (value: T) => Promise<U>): Promise<Awaited<U>[]>;

        sortBy(key: (value: T) => number): T[];
        sortBy(key: (value: T) => number | Promise<number>): Promise<T[]>;
    }
    interface SetConstructor {
        of<T>(...items: T[]): Set<T>
    }
    interface Set<T> {
        toArray(): T[];
    }
}

Array.prototype.first = function () {
    return this.at(0);
};

Array.prototype.filterType = function <F extends TypeFilter>(type: F) {
    return this.filter(typeFilter(type));
};

Array.prototype.findIndexOfType = function <F extends TypeFilter>
    (type: F, predicate: (_: IntoType<F>) => boolean) {
    return this.findIndex(value => typeFilter(type)(value) && predicate(value));
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

Array.prototype.repeat = function (count: number) {
    return Array.apply(0, Array(count)).flatMap(() => this);
};

Array.prototype.pushAndReturn = function (value: any) {
    this.push(value);
    return this.at(-1);
};

Array.prototype.unique = function () {
    return [...new Set(this)];
};

Array.prototype.asyncMap = async function <U>(func: (value: any) => Promise<U>) {
    return await Promise.all(this.map(func));
};

Array.prototype.sortBy = function (key: (value: any) => any): any {
    const sortItems = (items: { key: number, value: any }[]) =>
        items.sort((x, y) => x.key - y.key).map(item => item.value);
    const items = this.map(value => ({ value, key: key(value) }));
    if (items.every(item => typeof item.key === 'number')) return sortItems(items);
    return (async () => sortItems(await items.asyncMap(async item => 
        ({ key: await item.key, value: item.value }))))();
};

Set.of = <T>(...items: T[]) => {
    return new Set(items);
};

Set.prototype.toArray = function () {
    return [...this];
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