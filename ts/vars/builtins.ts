import { logger } from '../utils/logger.js';
import type { GalVar } from './types.js';
import { BoolType, GalNum, isArray, isEnum, isNum, isString } from './types.js';

class BuiltinVar {
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
class BuiltinFunc {
    constructor(public func: (_: GalVar) => GalVar) { }
    apply(value: GalVar) {
        return this.func(value);
    }
}

const builtinNumFunc = (func: (_: number) => number) => (value: GalVar) => {
    if (isNum(value)) return new GalNum(func(value.value));
    throw new Error(`Function cannot be applied on ${value.getType()}`);
};

export class Builtins {
    builtins: Record<string, BuiltinVar> = {};
    builtinFuncs: Record<string, BuiltinFunc> = {};

    registerBuiltin(name: string, getter: () => GalVar, setter?: (value: GalVar) => void) {
        this.builtins[name] = new BuiltinVar(getter, setter);
    }
    registerBuiltinFunc(name: string, func: (_: GalVar) => GalVar) {
        this.builtinFuncs[name] = new BuiltinFunc(func);
    }

    initBuiltins(proto: Builtins = prototype) {
        this.builtins = proto.builtins;
        this.builtinFuncs = proto.builtinFuncs;
    }
}

const prototype = new Builtins();

prototype.registerBuiltin('random', () => new GalNum(Math.random()));
prototype.registerBuiltin('randBool', () => BoolType.ofBool(Math.random() < 0.5));

prototype.registerBuiltin('yearNow', () => new GalNum(new Date().getFullYear()));
prototype.registerBuiltin('monthNow', () => new GalNum(new Date().getMonth() + 1));
prototype.registerBuiltin('dateNow', () => new GalNum(new Date().getDate()));
prototype.registerBuiltin('hourNow', () => new GalNum(new Date().getHours()));
prototype.registerBuiltin('minuteNow', () => new GalNum(new Date().getMinutes()));
prototype.registerBuiltin('secondNow', () => new GalNum(new Date().getSeconds()));
prototype.registerBuiltin('timeStamp', () => new GalNum(new Date().getTime()));

prototype.registerBuiltin('E', () => new GalNum(Math.E));
prototype.registerBuiltin('PI', () => new GalNum(Math.PI));

prototype.registerBuiltin('LOGGER', () => new GalNum(0), value => logger.log(value));

prototype.registerBuiltinFunc('sin', builtinNumFunc(Math.sin));
prototype.registerBuiltinFunc('cos', builtinNumFunc(Math.cos));
prototype.registerBuiltinFunc('tan', builtinNumFunc(Math.tan));
prototype.registerBuiltinFunc('ln', builtinNumFunc(Math.log));

prototype.registerBuiltinFunc('indexOf', value => {
    if (isEnum(value)) return new GalNum(value.valueIndex);
    throw new Error(`Cannot get index of ${value.getType()}`);
});
prototype.registerBuiltinFunc('lengthOf', value => {
    if (isEnum(value)) return new GalNum(value.enumType.values.length);
    if (isString(value) || isArray(value)) return new GalNum(value.value.length);
    throw new Error(`Cannot get length of ${value.getType()}`);
});