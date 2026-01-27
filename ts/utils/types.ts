export function getType(object: any) {
    return Object.prototype.toString.call(object).slice(8, -1);
}

export type Constructor<T> = abstract new (..._: any[]) => T;

export interface ClassOf<Type> { prototype: Type; };

export type Func<TArgs extends any[], TReturn> = (...args: TArgs) => TReturn | Promise<TReturn>;

interface Types {
    'bigint': bigint,
    'boolean': boolean,
    'function': Function,
    'number': number,
    'object': object,
    'string': string,
    'symbol': symbol,
    'undefined': undefined
}

export type TypeFilter = Constructor<any> | keyof Types;
export type IntoType<T extends TypeFilter> = T extends keyof Types ? Types[T]
    : T extends Constructor<infer U> ? U : never;

export const typeFilter = <T extends TypeFilter>(type: T) => (object: unknown) => {
    if (typeof type === 'string') return typeof object === type;
    return object instanceof (type as Constructor<any>);
};