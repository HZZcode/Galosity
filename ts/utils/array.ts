import { Constructor, Func } from "./types.js";

export function findDuplicates<T>(array: T[]): T[] {
    return array.filter((item, index) => array.indexOf(item) !== index);
}

declare global {
    interface Array<T> {
        first(): T | undefined;

        filterType<U>(type: Constructor<U>): U[];

        findIndexOfType<U>(type: Constructor<U>, predicate: Func<[U], boolean>): number;
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