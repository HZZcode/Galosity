import { GalVar, isNum, GalNum } from './types.js';

export class BuiltinVar {
    constructor(public getter: () => GalVar, public setter?: (value: GalVar) => void) { }
    get() {
        return this.getter();
    }
    set(value: GalVar) {
        if (this.setter === undefined)
            throw new Error(`Cannot assign to readonly builtin var`);
        this.setter(value);
    }
}
export class BuiltinFunc {
    constructor(public func: (_: GalVar) => GalVar) { }
    apply(value: GalVar) {
        return this.func(value);
    }
}
export const builtinNumFunc = (func: (_: number) => number) => (value: GalVar) => {
    if (isNum(value)) return new GalNum(func(value.value));
    throw new Error(`Function cannot be applied on ${value.getType()}`);
};
