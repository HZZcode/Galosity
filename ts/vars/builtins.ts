import { GalVar, isNum, GalNum } from './types.js';

export class BuiltinVar {
    factory;
    constructor(factory: () => GalVar) {
        this.factory = factory;
    }
    get() {
        return this.factory();
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
