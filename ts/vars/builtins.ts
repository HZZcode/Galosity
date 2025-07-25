import { GalVar, isNum, GalNum } from './types.js';

export class BuiltinVar {
    getter;
    setter;
    constructor(getter: () => GalVar, setter?: (value: GalVar) => void) {
        this.getter = getter;
        this.setter = setter;
    }
    get() {
        return this.getter();
    }
    set(value: GalVar) {
        if (this.setter === undefined)
            throw `Cannot assign to readonly builtin var`;
        this.setter(value);
    }
}
export class BuiltinFunc {
    func;
    constructor(func: (_: GalVar) => GalVar) {
        this.func = func;
    }
    apply(value: GalVar) {
        return this.func(value);
    }
}
export const builtinNumFunc = (func: (_: number) => number) => (value: GalVar) => {
    if (isNum(value)) return new GalNum(func(value.value));
    throw `Function cannot be applied on ${value.getType()}`;
};
