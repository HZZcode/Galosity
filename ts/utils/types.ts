export function getType(object: any) {
    return Object.prototype.toString.call(object).slice(8, -1);
}

export type Constructor<T> = abstract new (..._: any[]) => T;

export type Func<TArgs extends any[], TReturn>
    = ((...args: TArgs) => TReturn) | ((...args: TArgs) => Promise<TReturn>)
    | ((...args: TArgs) => TReturn | Promise<TReturn>);

export type UppercaseFirst<S extends string> = S extends `${infer F}${infer R}` ? `${Uppercase<F>}${R}` : S;

export type ExpectExtends<T extends U, U> = [T, U];
