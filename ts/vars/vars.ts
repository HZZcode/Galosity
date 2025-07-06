const lodash = require('lodash');
// @ts-expect-error This import is relative to the compiled js file
import * as grammar from './grammar.js';
import { assert } from '../utils/assert.js';
import { splitWith } from '../utils/split.js';
import { GalVar, GalNum, GalEnum, GalEnumType, BoolType, isBool, isEnum, isNum } from './types.js';
import { isDiscarded, isIdentifier } from '../utils/string.js';
import { BuiltinVar, BuiltinFunc, builtinNumFunc } from './builtins.js';

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
                assert(!isNaN(value));
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
        const noOp = () => { throw `Operator ${node.operator} cannot be applied on ${value.getType()}`; };
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
}