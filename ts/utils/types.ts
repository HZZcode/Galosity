export function getType(object: any) {
    return Object.prototype.toString.call(object).slice(8, -1);
}

export type Constructor<T> = new (..._: any[]) => T;

export type Func<TArgs extends any[], TReturn>
    = ((...args: TArgs) => TReturn) | ((...args: TArgs) => Promise<TReturn>) 
    | ((...args: TArgs) => TReturn | Promise<TReturn>);
