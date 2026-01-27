import type { ClassOf } from "./types";

interface Serializable {
    toString(): string;
}

interface DeserializableClass<Type> {
    fromString(str: string): Type;
}

// This is just a tag
export function Serializable<Type extends Serializable, Class extends ClassOf<Type>
    & DeserializableClass<Type>>(target: Class) {
    return target;
}

export interface Copy {
    copy(): this;
}

export type IsCopyable<T>
    = T extends readonly (infer U)[] ? IsCopyable<U>
    : T extends { copy(): T } ? true
    : T extends object ? { [K in keyof T]: IsCopyable<T[K]> }[keyof T] extends true
    ? true : false : false;

export function copy<T>(object: IsCopyable<T> extends true ? T : never): T;

export function copy(object: any) {
    if (Array.isArray(object)) return object.map(copy as any);
    if ('copy' in object) return object.copy();
    return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, (value as any).copy()]));
}