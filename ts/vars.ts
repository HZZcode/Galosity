const lodash = require('lodash');
// @ts-expect-error
import * as grammar from './grammar.js';
import { splitWith } from './split.js';

function findDuplicates<T>(array: T[]): T[] {
    return array.filter((item, index) => array.indexOf(item) !== index);
}

export function isIdentifier(str: string) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}

function isDiscarded(str: string) {
    return /^_+$/.test(str);
}

export class GalVar {
    type: string;
    constructor(type: string) {
        this.type = type;
    }
    getType() {
        return 'GalVar';
    }
    toBool(): boolean {
        if (isBool(this)) return !!this.valueIndex;
        throw `Cannot convert ${this.getType()} into bool`;
    }
    toNum() {
        if (isNum(this)) return this.value;
        throw `Cannot convert ${this.getType()} into num`;
    }
}

export class GalNum extends GalVar {
    value;
    constructor(value: number) {
        super('num');
        if (isNaN(value)) throw 'Num cannot be NaN';
        this.value = value;
    }

    getType() {
        return this.type;
    }

    toString() {
        const str = this.value.toString();
        if (!/[0-9]+\./.test(str)) return str;
        let pow = 1;
        for (let i = 0; i < 15; i++) {
            const rounded = Math.round(this.value * pow) / pow;
            if (Math.abs(this.value - rounded) < 1 / (1000 * pow))
                return rounded.toString();
            pow *= 10;
        }
        return str;
    }
}

export class GalEnumType {
    name;
    values;
    constructor(name: string, values: string[]) {
        this.name = name;
        this.values = values;

        const duplicates = findDuplicates(values);
        if (duplicates.length !== 0)
            throw `Found duplicate enum value: ${name}.${duplicates[0]}`;

        if (!isIdentifier(name)) throw `Name of enum ${name} is invalid`;
        const nonIdentifiers = values.filter(value => !isIdentifier(value));
        if (nonIdentifiers.length !== 0)
            throw `Name of enum value ${name}.${nonIdentifiers[0]} is invalid`;
    }

    toString() {
        return `${this.name}:${this.values.join('|')}`;
    }

    static fromString(str: string) {
        const [name, values] = splitWith(':')(str);
        return new GalEnumType(name, values.split('|'));
    }

    getValue(value: string) {
        return GalEnum.fromString(this, value);
    }

    ofIndex(index: number) {
        if (index >= this.values.length) throw `Enum index out of bound: ${index}`;
        return GalEnum.fromString(this, this.values[index]);
    }

    apply(value: GalVar) {
        if (!isNum(value)) throw `Cannot convert from ${value.getType()} to ${this.name}`;
        const num = value.value;
        const index = Math.round(num);
        if (Math.abs(num - index) < 1e-5) return this.ofIndex(index);
        throw `Cannot convert non-integer into enum ${this.name}`;
    }
}

export class GalEnum extends GalVar {
    enumType;
    valueIndex;

    constructor(enumType: GalEnumType, index: number) {
        super('enum');
        this.enumType = enumType;
        this.valueIndex = index;
    }

    static fromString(enumType: GalEnumType, value: string) {
        const index = enumType.values.indexOf(value);
        if (index === -1)
            throw `value ${value} is not a legal value for enum ${enumType.name}: `
            + `must be a value in ${enumType.values}`;
        return new GalEnum(enumType, index);
    }

    getType() {
        return this.enumType.name;
    }

    getName() {
        return this.enumType.values[this.valueIndex];
    }

    toString() {
        return `${this.enumType.name}.${this.getName()}`;
    }
}

class GalBoolEnumType extends GalEnumType {
    constructor() {
        super('bool', ['false', 'true']);
    }
    ofBool(b: boolean) {
        return this.getValue(b ? 'true' : 'false')
    }
}

export const BoolType = new GalBoolEnumType();

class BuiltinVar {
    factory;
    constructor(factory: () => GalVar) {
        this.factory = factory;
    }
    get() {
        return this.factory();
    }
}

class BuiltinFunc {
    func;
    constructor(func: (_: GalVar) => GalVar) {
        this.func = func;
    }
    apply(value: GalVar) {
        return this.func(value);
    }
}

const builtinNumFunc = (func: (_: number) => number) => (value: GalVar) => {
    if (isNum(value)) return new GalNum(func(value.value));
    throw `Function cannot be applied on ${value.getType()}`;
};

function isNum(value: GalVar): value is GalNum {
    return value.type === 'num';
}

function isEnum(value: GalVar): value is GalEnum {
    return value.type === 'enum';
}

function isBool(value: GalVar): value is GalEnum {
    return isEnum(value) && value.enumType.name === 'bool';
}

export class GalVars {
    enumTypes: GalEnumType[] = [BoolType];
    vars: { [name: string]: GalVar } = {};
    builtins: { [name: string]: BuiltinVar } = {};

    builtinFuncs: { [name: string]: BuiltinFunc } = {};

    warn = '';

    toString() {
        const varsPart = Object.entries(this.vars).map(entry => {
            const [name, value] = entry;
            return name + '=' + value.toString();
        }).join(',');
        const enumPart = this.enumTypes.map(type => type.toString()).join(',');
        return enumPart + ';' + varsPart;
    }

    static fromString(str: string) {
        try {
            const [enumPart, varsPart] = splitWith(';')(str);
            const vars = new GalVars();
            vars.vars = Object.fromEntries(varsPart.split(',').map(entry => {
                const [name, value] = splitWith('=')(entry);
                return [name, vars.evaluate(value)];
            }));
            vars.enumTypes = enumPart.split(',').map(type => GalEnumType.fromString(type));
            return vars;
        } catch (e) {
            throw 'Parse Error: ' + e;
        }
    }

    setVar(name: string, value: GalVar) {
        if (isDiscarded(name)) return;
        if (!isIdentifier(name)) throw `Invalid variable name: ${name}`;
        this.vars[name] = value;
    }

    clearEnumTypes() {
        this.enumTypes = [BoolType];
    }

    clearVars() {
        this.vars = {};
    }

    copy() {
        const clone = new GalVars();
        clone.builtins = this.builtins;
        clone.builtinFuncs = this.builtinFuncs;
        clone.vars = lodash.cloneDeep(this.vars);
        return clone;
    }

    registerBuiltin(name: string, func: () => GalVar) {
        this.builtins[name] = new BuiltinVar(func);
    }
    registerBuiltinFunc(name: string, func: (_: GalVar) => GalVar) {
        this.builtinFuncs[name] = new BuiltinFunc(func);
    }

    initBuiltins() {
        this.registerBuiltin('random', () => new GalNum(Math.random()));
        this.registerBuiltin('randBool', () => BoolType.ofBool(Math.random() < 0.5));

        this.registerBuiltin('yearNow', () => new GalNum(new Date().getFullYear()));
        this.registerBuiltin('monthNow', () => new GalNum(new Date().getMonth() + 1));
        this.registerBuiltin('dateNow', () => new GalNum(new Date().getDate()));
        this.registerBuiltin('hourNow', () => new GalNum(new Date().getHours()));
        this.registerBuiltin('minuteNow', () => new GalNum(new Date().getMinutes()));
        this.registerBuiltin('secondNow', () => new GalNum(new Date().getSeconds()));
        this.registerBuiltin('timeStamp', () => new GalNum(new Date().getTime()));

        this.registerBuiltin('E', () => new GalNum(Math.E));
        this.registerBuiltin('PI', () => new GalNum(Math.PI));

        this.registerBuiltinFunc('sin', builtinNumFunc(Math.sin));
        this.registerBuiltinFunc('cos', builtinNumFunc(Math.cos));
        this.registerBuiltinFunc('tan', builtinNumFunc(Math.tan));
        this.registerBuiltinFunc('ln', builtinNumFunc(Math.log));

        this.registerBuiltinFunc('indexOf', value => {
            if (isEnum(value)) return new GalNum(value.valueIndex);
            throw `Cannot get index of ${value.getType()}`;
        });
        this.registerBuiltinFunc('sizeOfType', value => {
            if (isEnum(value)) return new GalNum(value.enumType.values.length);
            throw `Cannot get size of ${value.getType()}`;
        });
    }

    defEnumType(enumType: GalEnumType) {
        if (this.enumTypes.some(type => type.name === enumType.name))
            throw `Multiple definition of enum type named ${enumType.name}`;
        this.enumTypes.push(enumType);
    }

    defEnumTypeIfUnexist(enumType: GalEnumType) {
        if (!this.isDefinedEnum(enumType.name)) this.defEnumType(enumType);
    }

    getEnumType(name: string) {
        return this.enumTypes.find(type => type.name === name);
    }

    getEnumValues() {
        const values: GalEnum[] = [];
        for (const enumType of this.enumTypes)
            for (const value of enumType.values)
                values.push(enumType.getValue(value));
        return values;
    }

    getEnumValue(name: string) {
        const values = this.getEnumValues();
        const found = values.filter(e => e.getName() === name);
        if (found.length > 1) throw `Found multiple enum value named ${name}`;
        if (found.length === 0) return undefined;
        return found[0];
    }

    isDefinedVar(name: string) {
        return name in this.vars;
    }

    isDefinedEnum(name: string) {
        return this.getEnumType(name) !== undefined;
    }

    isDefinedSymbol(name: string) {
        return this.isDefinedVar(name) || this.isDefinedEnum(name);
    }

    evaluate(expr: string) {
        try {
            const result = this.evaluateNode(grammar.parse(expr));
            if (result === undefined)
                throw `Unexpected expression: ${expr}`;
            return result;
        } catch (e) {
            throw `Cannot evaluate '${expr}': ` + e;
        }
    }

    evaluateNode(node: any): GalVar {
        switch (node.type) {
            case 'num': {
                const value = Number.parseFloat(node.value);
                this.assert(!isNaN(value));
                return new GalNum(value);
            }
            case 'enum': {
                const enumType = this.getEnumType(node.enumType.value);
                if (enumType === undefined)
                    throw `No such enum: ${node.enumType.value}`;
                return enumType.getValue(node.value.value);
            }
            case 'identifier': {
                return this.evaluateIdentifier(node);
            }
            case 'function': {
                const func = node.func.value;
                if (func === 'hasVar') {
                    if (node.value.type !== 'identifier')
                        throw `Function 'hasVar' can only be applied on identifier`;
                    try {
                        this.evaluateIdentifier(node.value);
                        return BoolType.ofBool(true);
                    } catch (_) {
                        return BoolType.ofBool(false);
                    }
                }
                const value = this.evaluateNode(node.value);
                if (func in this.builtinFuncs) return this.builtinFuncs[func].apply(value);
                const enumType = this.getEnumType(func);
                if (enumType !== undefined) return enumType.apply(value);
                throw `No such function: ${func}`;
            }
            case 'factor':
                return this.evaluateFactor(node);
            case 'leftBinary':
                return this.evaluateLeftBinaries(node);
            case 'rightBinary':
                return this.evaluateRightBinaries(node);
            case 'comparing':
                return this.evaluateComparings(node);
            case 'matching':
                return this.evaluateMatching(node);
            default: throw `Error Node!`;
        }
    }

    evaluateIdentifier(node: any): GalVar {
        const name = node.value;
        if (isDiscarded(name)) throw `${name} is discarded`;
        if (name in this.builtins) return this.builtins[name].get();
        if (name in this.vars) return this.vars[name];
        const enumValue = this.getEnumValue(name);
        if (enumValue !== undefined) return enumValue;
        throw `No such identifier or enum value: ${name}`;
    }

    evaluateFactor(node: any): GalVar {
        const value = this.evaluateNode(node.value);
        const noOp = (): never => { throw `Operator ${node.operator} cannot be applied on ${value.getType()}`; };
        switch (node.operator) {
            case '+':
                if (!isNum(value)) return noOp();
                return new GalNum(+value.value);
            case '-':
                if (!isNum(value)) return noOp();
                return new GalNum(-value.value);
            case '!':
                if (!isBool(value)) noOp();
                return BoolType.ofBool(!value.toBool());
        }
        return noOp();
    }

    equal(x: GalVar, y: GalVar) {
        if (isNum(x) && isNum(y))
            return Math.abs(x.value - y.value) <= 1e-5;
        if (isEnum(x) && isEnum(y))
            if (x.enumType.name === y.enumType.name)
                return x.valueIndex === y.valueIndex;
        this.warn = `Trying to compare ${x.getType()} and ${y.getType()}`;
        return false;
    }

    evaluateSingleBinary(op: string, x: GalVar, y: GalVar): GalVar {
        const noOp = () => { throw `Operator ${op} cannot be applied on ${x.getType()} and ${y.getType()}`; };
        switch (op) {
            case '+':
                if (!isNum(x) || !isNum(y)) return noOp();
                return new GalNum(x.value + y.value);
            case '-':
                if (!isNum(x) || !isNum(y)) return noOp();
                return new GalNum(x.value - y.value);
            case '*':
                if (!isNum(x) || !isNum(y)) return noOp();
                return new GalNum(x.value * y.value);
            case '/':
                if (!isNum(x) || !isNum(y)) return noOp();
                return new GalNum(x.value / y.value);
            case '//':
                if (!isNum(x) || !isNum(y)) return noOp();
                return new GalNum(Math.floor(x.value / y.value));
            case '%':
                if (!isNum(x) || !isNum(y)) return noOp();
                return new GalNum(x.value % y.value);
            case '^':
                if (!isNum(x) || !isNum(y)) return noOp();
                return new GalNum(Math.pow(x.value, y.value));
            case '&':
                if (!isBool(x) || !isBool(y)) return noOp();
                return BoolType.ofBool(x.toBool() && y.toBool());
            case '|':
                if (!isBool(x) || !isBool(y)) return noOp();
                return BoolType.ofBool(x.toBool() || y.toBool());
            case '<=':
                if (!isNum(x) || !isNum(y)) return noOp();
                return BoolType.ofBool(x.value <= y.value);
            case '>=':
                if (!isNum(x) || !isNum(y)) return noOp();
                return BoolType.ofBool(x.value >= y.value);
            case '<':
                if (!isNum(x) || !isNum(y)) return noOp();
                return BoolType.ofBool(x.value < y.value);
            case '>':
                if (!isNum(x) || !isNum(y)) return noOp();
                return BoolType.ofBool(x.value > y.value);
            case '==':
                return BoolType.ofBool(this.equal(x, y));
            case '!=':
                return BoolType.ofBool(!this.equal(x, y));
        }
        return noOp();
    }

    evaluateLeftBinaries(node: any): GalVar {
        const ops = (node.value.length - 1) / 2;
        let result = this.evaluateNode(node.value[0]);
        for (let i = 0; i < ops; i++) {
            const op = node.value[2 * i + 1];
            const value = this.evaluateNode(node.value[2 * i + 2]);
            result = this.evaluateSingleBinary(op, result, value);
        }
        return result;
    }

    evaluateRightBinaries(node: any): GalVar {
        const ops = (node.value.length - 1) / 2;
        let result = this.evaluateNode(node.value.at(-1));
        for (let i = ops - 1; i >= 0; i--) {
            const value = this.evaluateNode(node.value[2 * i]);
            const op = node.value[2 * i + 1];
            result = this.evaluateSingleBinary(op, value, result);
        }
        return result;
    }

    evaluateComparings(node: any): GalVar {
        const ops = (node.value.length - 1) / 2;
        for (let i = 0; i < ops; i++) {
            const left = this.evaluateNode(node.value[2 * i]);
            const op = node.value[2 * i + 1];
            const right = this.evaluateNode(node.value[2 * i + 2]);
            if (!this.evaluateSingleBinary(op, left, right).toBool())
                return BoolType.ofBool(false);
        }
        return BoolType.ofBool(true);
    }

    evaluateMatching(node: any): GalVar {
        const value = this.evaluateNode(node.value);
        const type = node.enumType;
        if (type === 'num') return BoolType.ofBool(isNum(value));
        return BoolType.ofBool(isEnum(value) && value.enumType.name === type);
    }

    assert(condition: boolean, message = 'Assertion failed') {
        if (!condition) throw message;
    }
}