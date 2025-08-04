import { Constructor, Func } from "./types.js";

const { v4: uuid } = require('uuid');

export type DispatchFunc<TThisArg, TArgs extends any[], TReturn> = Func<[TThisArg, ...TArgs], TReturn>;

export class TypeDispatch<TArgs extends any[], TReturn, TThisBase = unknown> {
    funcName;
    defaultValue?: TReturn;

    constructor(defaultValue?: TReturn) {
        if (defaultValue !== undefined) this.defaultTo(defaultValue);
        this.funcName = `dispatch_ZZ_func_${uuid().replaceAll('-', '_')}`;
    }

    defaultTo(defaultValue: TReturn) {
        this.defaultValue = defaultValue;
    }

    register<TThisArg extends TThisBase>(type: Constructor<TThisArg>,
        func: DispatchFunc<TThisArg, TArgs, TReturn>) {
        type.prototype[this.funcName] = func;
    }

    async call<TThisArg extends TThisBase>(thisArg: TThisArg, ...args: TArgs) {
        const func = (thisArg as
            { [_: string]: DispatchFunc<TThisArg, TArgs, TReturn> | undefined })[this.funcName];
        if (func === undefined) {
            if (this.defaultValue === undefined) throw new Error(`Dispatch Error!`);
            return this.defaultValue;
        }
        return await func(thisArg, ...args);
    }
}