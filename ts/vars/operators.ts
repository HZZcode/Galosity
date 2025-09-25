import { notUndefined } from "../utils/assert.js";
import type { Constructor } from "../utils/types.js";
import { BoolType, GalArray, GalNum, GalSequence, GalString, GalVar } from "./types.js";

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

    error(op: string, ...values: TBase[]): never {
        throw new Error(`Operator ${op} cannot be applied on `
            + values.map(value => value.getType()).join(' and '));
    }

    applyUnary(op: string, value: TBase) {
        let result: TReturn | undefined;
        for (const unary of this.unary)
            if ((result = unary.apply(op, value)) !== undefined)
                return result;
        this.error(op, value);
    }
    applyBinary(op: string, values: [TBase, TBase]) {
        let result: TReturn | undefined;
        for (const binary of this.binary)
            if ((result = binary.apply(op, values)) !== undefined)
                return result;
        this.error(op, ...values);
    }
}

export const operators = new Operators<GalVar, GalVar>();

operators.registerUnary('+', GalNum, value => new GalNum(+value.value));
operators.registerUnary('-', GalNum, value => new GalNum(-value.value));
operators.registerUnary('!', GalVar, value => BoolType.ofBool(!value.toBool()));

operators.registerBinary('[]', [GalSequence, GalNum], (x, y) => notUndefined(x.getIndex(y.value),
    `${x.getType().capitalize()} access out of range: ${x.reprString()}[${y.value}]`));

operators.registerBinary('+', [GalNum, GalNum], (x, y) => new GalNum(x.value + y.value));
operators.registerBinary('+', [GalString, GalString], (x, y) => x.combine(y));
operators.registerBinary('+', [GalArray, GalArray], (x, y) => x.combine(y));
operators.registerBinary('-', [GalNum, GalNum], (x, y) => new GalNum(x.value - y.value));
operators.registerBinary('*', [GalNum, GalNum], (x, y) => new GalNum(x.value * y.value));
operators.registerBinary('*', [GalSequence, GalNum], (x, y) => x.repeat(y.value));
operators.registerBinary('*', [GalNum, GalSequence], (x, y) => y.repeat(x.value));
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