import { MetaInfo } from '../plugin/meta-info.js';
import { logger } from '../utils/logger.js';
import { Random } from '../utils/random.js';
import type { GalVar } from './types.js';
import { BoolType, GalArray, GalNum, GalString, isEnum, isNum, isString } from './types.js';

class BuiltinVar {
    constructor(public getter: () => GalVar, public setter?: (value: GalVar) => void) { }
    get() {
        return this.getter();
    }
    set(value: GalVar) {
        if (this.setter === undefined)
            throw new Error('Cannot assign to readonly builtin var');
        this.setter(value);
    }
}

const numArray = (array: number[]) => new GalArray(array.map(num => new GalNum(num)));

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
export const builtinEvalFunc = (evaluate: (_: string) => GalVar) => (value: GalVar) => {
    if (isString(value)) return evaluate(value.value);
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

prototype.registerBuiltin('random', () => new GalNum(Random.nextNum));
prototype.registerBuiltin('randBool', () => BoolType.ofBool(Random.nextBool));

prototype.registerBuiltin('timeNow', () => numArray([
    new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate(),
    new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()
]));
prototype.registerBuiltin('timeStamp', () => new GalNum(new Date().getTime()));

prototype.registerBuiltin('E', () => new GalNum(Math.E));
prototype.registerBuiltin('PI', () => new GalNum(Math.PI));

prototype.registerBuiltin('version', () => numArray(new MetaInfo().version.parts));
prototype.registerBuiltin('versionString', () => new GalString(new MetaInfo().version.toString()));
prototype.registerBuiltin('versionName', () => new GalString(new MetaInfo().versionName));

prototype.registerBuiltin('LOGGER', () => new GalNum(0), logger.log);

prototype.registerBuiltinFunc('sin', builtinNumFunc(Math.sin));
prototype.registerBuiltinFunc('cos', builtinNumFunc(Math.cos));
prototype.registerBuiltinFunc('tan', builtinNumFunc(Math.tan));
prototype.registerBuiltinFunc('ln', builtinNumFunc(Math.log));
prototype.registerBuiltinFunc('lg', builtinNumFunc(Math.log10));

prototype.registerBuiltinFunc('indexOf', value => {
    if (isEnum(value)) return new GalNum(value.valueIndex);
    throw new Error(`Cannot get index of ${value.getType()}`);
});
prototype.registerBuiltinFunc('lengthOf', value => new GalNum(value.len));
prototype.registerBuiltinFunc('toString', value => new GalString(value.toString()));