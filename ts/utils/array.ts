import { Constructor } from "./types.js";

export function findDuplicates<T>(array: T[]): T[] {
    return array.filter((item, index) => array.indexOf(item) !== index);
}

declare global {
    interface Array<T> {
        filterType<U>(type: Constructor<U>): U[];
    }
}

Array.prototype.filterType = function <U>(type: Constructor<U>): U[] {
    return this.filter((item: any) => item instanceof type);
};