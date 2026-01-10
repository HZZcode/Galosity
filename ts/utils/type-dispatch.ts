const { v4: uuid } = require('uuid');

import type { Constructor, Func } from './types.js';

export type DispatchFunc<ThisArg, TArgs extends any[], TReturn> = Func<[ThisArg, ...TArgs], TReturn>;

export class TypeDispatch<TArgs extends any[], TReturn, ThisBase = unknown> {
    funcName;
    defaultValue?: TReturn;

    constructor(defaultValue?: TReturn) {
        if (defaultValue !== undefined) this.defaultTo(defaultValue);
        this.funcName = `dispatch_ZZ_func_${uuid().replaceAll('-', '_')}`;
    }

    defaultTo(defaultValue: TReturn) {
        this.defaultValue = defaultValue;
    }

    register<ThisArg extends ThisBase>(type: Constructor<ThisArg>,
        func: DispatchFunc<ThisArg, TArgs, TReturn>) {
        type.prototype[this.funcName] = func;
    }

    async call<ThisArg extends ThisBase>(thisArg: ThisArg, ...args: TArgs) {
        const func = (thisArg as
            Record<string, DispatchFunc<ThisArg, TArgs, TReturn> | undefined>)[this.funcName];
        if (func === undefined) {
            if (this.defaultValue === undefined) throw new Error(`Dispatch Error!`);
            return this.defaultValue;
        }
        return await func(thisArg, ...args);
    }
}