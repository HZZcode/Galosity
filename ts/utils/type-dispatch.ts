const { v4: uuid } = require('uuid');

export function getType(object: any) {
    return Object.prototype.toString.call(object).slice(8, -1);
}

type Func<TThisArg, TArgs extends any[], TReturn>
    = ((thisArg: TThisArg, ...args: TArgs) => TReturn)
    | ((thisArg: TThisArg, ...args: TArgs) => Promise<TReturn>);

export class TypeDispatch<TArgs extends any[], TReturn, TThisBase = unknown> {
    funcName;
    defaultValue?: TReturn;

    constructor() {
        this.funcName = `dispatch_ZZ_func_${uuid().replaceAll('-', '_')}`;
    }

    defaultTo(defaultValue: TReturn) {
        this.defaultValue = defaultValue;
    }

    register<TThisArg extends TThisBase>(prototype: TThisArg, func: Func<TThisArg, TArgs, TReturn>) {
        (prototype as { [_: string]: Func<TThisArg, TArgs, TReturn> })[this.funcName] = func;
    }

    async call<TThisArg extends TThisBase>(thisArg: TThisArg, ...args: TArgs) {
        const func = (thisArg as { [_: string]: Func<TThisArg, TArgs, TReturn> | undefined })[this.funcName];
        if (func === undefined) {
            if (this.defaultValue === undefined) throw `Dispatch Error!`;
            return this.defaultValue;
        }
        return await func(thisArg, ...args);
    }
}