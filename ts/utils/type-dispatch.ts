import { notUndefined } from './assert.js';
import type { Constructor, Func } from './types.js';

export type DispatchFunc<ThisArg, TArgs extends any[], TReturn> = Func<[ThisArg, ...TArgs], TReturn>;

export class TypeDispatch<TArgs extends any[], TReturn, ThisBase = unknown> {
    static id = 0;
    funcName;
    defaultValue?: TReturn;

    constructor(defaultValue?: TReturn) {
        if (defaultValue !== undefined) this.defaultTo(defaultValue);
        this.funcName = `dispatch_ZZ_func_${TypeDispatch.id++}`;
    }

    defaultTo(defaultValue: TReturn) {
        this.defaultValue = defaultValue;
    }

    register<ThisArg extends ThisBase>(type: Constructor<ThisArg>,
        func: DispatchFunc<ThisArg, TArgs, TReturn>) {
        type.prototype[this.funcName] = func;
    }

    async call<ThisArg extends ThisBase>(thisArg: ThisArg, ...args: TArgs) {
        const func = (thisArg as any)[this.funcName] as DispatchFunc<ThisArg, TArgs, TReturn> | undefined;
        return await func?.(thisArg, ...args) ?? notUndefined(this.defaultValue, `Dispatch Error!`);
    }
}