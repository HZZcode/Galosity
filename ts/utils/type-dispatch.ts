const { v4: uuid } = require('uuid');

export function getType(object: any) {
    return Object.prototype.toString.call(object).slice(8, -1);
}

export type Func<TArgs extends any[], TReturn>
    = ((...args: TArgs) => TReturn) | ((...args: TArgs) => Promise<TReturn>);

export type DispatchFunc<TThisArg, TArgs extends any[], TReturn> = Func<[TThisArg, ...TArgs], TReturn>;

export class TypeDispatch<TArgs extends any[], TReturn, TThisBase = unknown> {
    funcName;
    defaultValue?: TReturn;

    constructor() {
        this.funcName = `dispatch_ZZ_func_${uuid().replaceAll('-', '_')}`;
    }

    defaultTo(defaultValue: TReturn) {
        this.defaultValue = defaultValue;
    }

    register<TThisArg extends TThisBase>(prototype: TThisArg, func: DispatchFunc<TThisArg, TArgs, TReturn>) {
        (prototype as { [_: string]: DispatchFunc<TThisArg, TArgs, TReturn> })[this.funcName] = func;
    }

    async call<TThisArg extends TThisBase>(thisArg: TThisArg, ...args: TArgs) {
        const func = (thisArg as
            { [_: string]: DispatchFunc<TThisArg, TArgs, TReturn> | undefined })[this.funcName];
        if (func === undefined) {
            if (this.defaultValue === undefined) throw `Dispatch Error!`;
            return this.defaultValue;
        }
        return await func(thisArg, ...args);
    }
}