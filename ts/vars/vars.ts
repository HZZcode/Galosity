const lodash = require('lodash');

import { assert } from '../utils/assert.js';
import { logger } from '../utils/logger.js';
import { splitWith } from '../utils/split.js';
import { isDiscarded, isIdentifier } from '../utils/string.js';
import type { ExpectExtends, UppercaseFirst } from "../utils/types.js";
import { BuiltinFunc, builtinNumFunc, BuiltinVar } from './builtins.js';
import * as grammar from './grammar/grammar.js';
import { operators } from './operators.js';
import type { GalEnum, GalVar } from './types.js';
import {
    BoolType, GalArray, GalEnumType, GalNum, GalString, isArray, isEnum, isNum, isString
} from './types.js';

type NodeTypes = 'leftBinary' | 'rightBinary' | 'comparing' | 'matching' | 'factor' |
    'index' | 'function' | 'array' | 'string' | 'hexNum' | 'num' | 'enum' | 'identifier';
type NodeType = {
    type: NodeTypes,
    [_: string]: any
}

function notNaN(num: number) {
    assert(!isNaN(num));
    return num;
}

export class GalVars {
    enumTypes: GalEnumType[] = [BoolType];
    vars: Record<string, GalVar> = {};
    builtins: Record<string, BuiltinVar> = {};

    builtinFuncs: Record<string, BuiltinFunc> = {};

    warn = '';

    toString() {
        const varsPart = Object.entries(this.vars).map(entry => {
            const [name, value] = entry;
            return name + '=' + value.reprString();
        }).join(',');
        const enumPart = this.enumTypes.map(type => type.toString()).join(',');
        return enumPart + ';' + varsPart;
    }

    static fromString(str: string) {
        try {
            const [enumPart, varsPart] = splitWith(';')(str);
            const vars = new GalVars();
            if (varsPart !== '')
                vars.vars = Object.fromEntries(varsPart.split(',').map(entry => {
                    const [name, value] = splitWith('=')(entry);
                    return [name, vars.evaluate(value)];
                }));
            vars.enumTypes = enumPart.split(',').map(type => GalEnumType.fromString(type));
            return vars;
        } catch (e) {
            throw new Error('Parse Error: ' + e);
        }
    }

    setVar(name: string, value: GalVar) {
        if (isDiscarded(name)) return;
        if (!isIdentifier(name)) throw new Error(`Invalid variable name: ${name}`);
        if (name in this.builtins) this.builtins[name].set(value);
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

    registerBuiltin(name: string, getter: () => GalVar, setter?: (value: GalVar) => void) {
        this.builtins[name] = new BuiltinVar(getter, setter);
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

        this.registerBuiltin('LOGGER', () => new GalNum(0), value => logger.log(value));

        this.initBuiltinFuncs();
    }

    initBuiltinFuncs() {
        this.registerBuiltinFunc('sin', builtinNumFunc(Math.sin));
        this.registerBuiltinFunc('cos', builtinNumFunc(Math.cos));
        this.registerBuiltinFunc('tan', builtinNumFunc(Math.tan));
        this.registerBuiltinFunc('ln', builtinNumFunc(Math.log));

        this.registerBuiltinFunc('indexOf', value => {
            if (isEnum(value)) return new GalNum(value.valueIndex);
            throw new Error(`Cannot get index of ${value.getType()}`);
        });
        this.registerBuiltinFunc('lengthOf', value => {
            if (isEnum(value)) return new GalNum(value.enumType.values.length);
            if (isString(value) || isArray(value)) return new GalNum(value.value.length);
            throw new Error(`Cannot get length of ${value.getType()}`);
        });
    }

    defEnumType(enumType: GalEnumType) {
        if (this.enumTypes.some(type => type.name === enumType.name))
            throw new Error(`Multiple definition of enum type named ${enumType.name}`);
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
        if (found.length > 1) throw new Error(`Found multiple enum value named ${name}`);
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
                throw new Error(`Unexpected expression: ${expr}`);
            return result;
        } catch (e) {
            throw new Error(`Cannot evaluate '${expr}'`, { cause: e });
        }
    }

    evaluateNode(node: NodeType): GalVar {
        // Static check
        type FuncNames = `evaluate${UppercaseFirst<NodeTypes>}`;
        type _ = ExpectExtends<this, Record<FuncNames, (node: NodeType) => GalVar>>;

        const type = node.type;
        const funcName = 'evaluate' + type.uppercaseFirst();
        if (funcName in this) return (this as any)[funcName](node);
        throw new Error(`Error Node!`);
    }

    evaluateNum(node: NodeType) {
        return new GalNum(notNaN(parseFloat(node.value)));
    }

    evaluateHexNum(node: NodeType) {
        return new GalNum(notNaN(parseInt(node.value, 16)));
    }

    evaluateEnum(node: NodeType) {
        const enumType = this.getEnumType(node.enumType.value);
        if (enumType === undefined)
            throw new Error(`No such enum: ${node.enumType.value}`);
        return enumType.getValue(node.value.value);
    }

    evaluateIdentifier(node: NodeType) {
        const name = node.value;
        if (isDiscarded(name)) throw new Error(`${name} is discarded`);
        if (name in this.builtins) return this.builtins[name].get();
        if (name in this.vars) return this.vars[name];
        const enumValue = this.getEnumValue(name);
        if (enumValue !== undefined) return enumValue;
        throw new Error(`No such identifier or enum value: ${name}`);
    }

    evaluateString(node: NodeType) {
        return new GalString(JSON.parse(`"${node.value}"`).toString());
    }

    evaluateArray(node: NodeType) {
        return new GalArray((node.value as NodeType[]).map(value => this.evaluateNode(value)));
    }

    evaluateFunction(node: NodeType) {
        const func = node.func.value;
        if (func === 'hasVar') {
            assert(node.value.type === 'identifier', `Function 'hasVar' can only be applied on identifier`);
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
        throw new Error(`No such function: ${func}`);
    }

    evaluateFactor(node: NodeType) {
        return operators.applyUnary(node.operator, this.evaluateNode(node.value));
    }

    evaluateIndex(node: NodeType) {
        return operators.applyBinary('[]', [this.evaluateNode(node.value), this.evaluateNode(node.index)]);
    }

    evaluateSingleBinary(op: string, x: GalVar, y: GalVar) {
        return operators.applyBinary(op, [x, y]);
    }

    evaluateLeftBinary(node: NodeType) {
        const ops = (node.value.length - 1) / 2;
        let result = this.evaluateNode(node.value[0]);
        for (let i = 0; i < ops; i++) {
            const op = node.value[2 * i + 1];
            const value = this.evaluateNode(node.value[2 * i + 2]);
            result = this.evaluateSingleBinary(op, result, value);
        }
        return result;
    }

    evaluateRightBinary(node: NodeType) {
        const ops = (node.value.length - 1) / 2;
        let result = this.evaluateNode(node.value.at(-1));
        for (let i = ops - 1; i >= 0; i--) {
            const value = this.evaluateNode(node.value[2 * i]);
            const op = node.value[2 * i + 1];
            result = this.evaluateSingleBinary(op, value, result);
        }
        return result;
    }

    evaluateComparing(node: NodeType) {
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

    evaluateMatching(node: NodeType) {
        const value = this.evaluateNode(node.value);
        const type = node.enumType;
        if (type === 'num') return BoolType.ofBool(isNum(value));
        return BoolType.ofBool(isEnum(value) && value.enumType.name === type);
    }
}