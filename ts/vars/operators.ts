import { notUndefined } from "../utils/assert.js";
import type { Constructor } from "../utils/types.js";
import { BoolType, GalArray, GalNum, GalString, GalVar } from "./types.js";

class UnaryOp<TBase, TReturn> {
    constructor(public op: string, public type: Constructor<TBase>, public func: (_: any) => TReturn) { }

    apply(op: string, value: TBase) {
        if (op === this.op && value instanceof this.type) return this.func(value);
    }
}

class BinaryOp<TBase, TReturn> {
    constructor(public op: string, public types: [Constructor<TBase>, Constructor<TBase>],
        public func: (_: any, __: any) => TReturn) { }

    apply(op: string, values: [TBase, TBase]) {
        if (op === this.op && values[0] instanceof this.types[0] && values[1] instanceof this.types[1])
            return this.func(values[0], values[1]);
    }
}

class Operators<TBase extends { getType: () => string } = any, TReturn = any> {
    unary: UnaryOp<TBase, TReturn>[] = [];
    binary: BinaryOp<TBase, TReturn>[] = [];

    registerUnary<T extends TBase>(op: string, type: Constructor<T>, func: (_: T) => TReturn) {
        this.unary.push(new UnaryOp(op, type, func));
    }
    registerBinary<T extends TBase, U extends TBase>(op: string,
        types: [Constructor<T>, Constructor<U>], func: (_: T, __: U) => TReturn) {
        this.binary.push(new BinaryOp<TBase, TReturn>(op, types, func));
    }

    applyUnary(op: string, value: TBase) {
        let result: TReturn | undefined;
        for (const unary of this.unary)
            if ((result = unary.apply(op, value)) !== undefined)
                return result;
        throw new Error(`Operator ${op} cannot be applied on ${value.getType()}`);
    }
    applyBinary(op: string, values: [TBase, TBase]) {
        let result: TReturn | undefined;
        for (const binary of this.binary)
            if ((result = binary.apply(op, values)) !== undefined)
                return result;
        throw new Error(`Operator ${op} cannot be applied `
            + `on ${values[0].getType()} and ${values[1].getType()}`);
    }
}

export const operators = new Operators<GalVar, GalVar>();

operators.registerUnary('+', GalNum, value => new GalNum(+value.value));
operators.registerUnary('-', GalNum, value => new GalNum(-value.value));
operators.registerUnary('!', GalVar, value => BoolType.ofBool(!value.toBool()));

operators.registerBinary('[]', [GalString, GalNum], (x, y) => new GalString(notUndefined(x.value[y.value],
    `String access out of range: ${x.reprString()}[${y.value}]`)));
operators.registerBinary('[]', [GalArray, GalNum], (x, y) => notUndefined(x.value.at(y.value), 
    `Array access out of range: ${x.reprString()}[${y.value}]`));

operators.registerBinary('+', [GalNum, GalNum], (x, y) => new GalNum(x.value + y.value));
operators.registerBinary('+', [GalString, GalString], (x, y) => new GalString(x.value + y.value));
operators.registerBinary('+', [GalArray, GalArray], (x, y) => new GalArray([...x.value, ...y.value]));
operators.registerBinary('-', [GalNum, GalNum], (x, y) => new GalNum(x.value - y.value));
operators.registerBinary('*', [GalNum, GalNum], (x, y) => new GalNum(x.value * y.value));
operators.registerBinary('*', [GalString, GalNum], (x, y) => new GalString(x.value.repeat(y.value)));
operators.registerBinary('*', [GalNum, GalString], (x, y) => new GalString(y.value.repeat(x.value)));
operators.registerBinary('*', [GalArray, GalNum], (x, y) => new GalArray(x.value.repeat(y.value)));
operators.registerBinary('*', [GalNum, GalArray], (x, y) => new GalArray(y.value.repeat(x.value)));
operators.registerBinary('/', [GalNum, GalNum], (x, y) => new GalNum(x.value / y.value));
operators.registerBinary('//', [GalNum, GalNum], (x, y) => new GalNum(Math.floor(x.value / y.value)));
operators.registerBinary('%', [GalNum, GalNum], (x, y) => new GalNum(x.value % y.value));
operators.registerBinary('^', [GalNum, GalNum], (x, y) => new GalNum(Math.pow(x.value, y.value)));

operators.registerBinary('&', [GalVar, GalVar], (x, y) => BoolType.ofBool(x.toBool() && y.toBool()));
operators.registerBinary('|', [GalVar, GalVar], (x, y) => BoolType.ofBool(x.toBool() || y.toBool()));

operators.registerBinary('<', [GalNum, GalNum], (x, y) => BoolType.ofBool(x.value < y.value));
operators.registerBinary('>', [GalNum, GalNum], (x, y) => BoolType.ofBool(x.value > y.value));
operators.registerBinary('<=', [GalNum, GalNum], (x, y) => BoolType.ofBool(x.value <= y.value));
operators.registerBinary('>=', [GalNum, GalNum], (x, y) => BoolType.ofBool(x.value >= y.value));

operators.registerBinary('==', [GalVar, GalVar], (x, y) => BoolType.ofBool(x.equals(y)));
operators.registerBinary('!=', [GalVar, GalVar], (x, y) => BoolType.ofBool(!x.equals(y)));