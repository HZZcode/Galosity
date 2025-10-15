const lodash = require('lodash');

import { assert, notUndefined, wrapError } from '../utils/assert.js';
import { splitWith } from '../utils/split.js';
import { isDiscarded, isIdentifier } from '../utils/string.js';
import { builtinEvalFunc, Builtins } from './builtins.js';
import { parse } from './grammar/grammar.js';
import type * as nodes from './node-types.js';
import { operators } from './operators.js';
import type { GalEnum, GalVar } from './types.js';
import { BoolType, GalArray, GalEnumType, GalNum, GalString } from './types.js';

function notNaN(num: number) {
    assert(!isNaN(num));
    return num;
}

function tried<TArgs extends unknown[], TReturn>(func: (..._: TArgs) => TReturn, ...args: TArgs) {
    try {
        func(...args);
        return true;
    } catch (_) {
        return false;
    }
}

export class GalVars extends Builtins {
    enumTypes: GalEnumType[] = [BoolType];
    vars: Record<string, GalVar> = {};

    constructor() {
        super();
        this.initBuiltins();
        this.initBuiltinEvals();
    }

    initBuiltinEvals() {
        this.registerBuiltinFunc('eval', builtinEvalFunc(expr => this.eval(expr)));
        this.registerBuiltinFunc('evalInt', builtinEvalFunc(expr => {
            assert(/^-?\d+$/.test(expr), `Invalid Integer: '${expr}'`);
            return this.evalNum(expr);
        }));
        this.registerBuiltinFunc('evalNum', builtinEvalFunc(expr => {
            assert(/^-?\d+(\.\d+)?$/.test(expr), `Invalid Number: '${expr}'`);
            return this.evalNum(expr);
        }));
        this.registerBuiltinFunc('evalHexNum', builtinEvalFunc(expr => {
            assert(/^-?[0-9a-fA-F]+$/.test(expr), `Invalid Hexagon Number: '${expr}'`);
            return this.evalHexNum(expr);
        }));
    }

    override toString() {
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
                    return [name, vars.eval(value)];
                }));
            vars.enumTypes = enumPart.split(',').map(type => GalEnumType.fromString(type));
            return vars;
        } catch (e) {
            wrapError('Parse Error', e);
        }
    }

    setVar(name: string, value: GalVar) {
        if (isDiscarded(name)) return;
        assert(isIdentifier(name), `Invalid variable name: ${name}`);
        if (name in this.builtins) this.builtins[name].set(value);
        else this.vars[name] = value;
    }

    copy() {
        const clone = new GalVars();
        clone.enumTypes = lodash.cloneDeep(this.enumTypes);
        clone.vars = lodash.cloneDeep(this.vars);
        return clone;
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
        assert(found.length <= 1, `Found multiple enum value named ${name}`);
        return found.at(0);
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

    eval(expr: string) {
        try {
            return this.evalNode(parse(expr));
        } catch (e) {
            wrapError(`Cannot evaluate '${expr}'`, e);
        }
    }

    evalNode(node: nodes.NodeType): GalVar {
        return (this satisfies {
            [Tag in nodes.NodeTag as `eval${Capitalize<Tag>}`]: (node: nodes.NodeOf<Tag>) => GalVar;
        } as any)[`eval${node.type.capitalize()}`](node);
    }

    evalNum(node: nodes.DecNumNode | string) {
        return new GalNum(notNaN(parseFloat(typeof node === 'string' ? node : node.value)));
    }

    evalHexNum(node: nodes.HexNumNode | string) {
        return new GalNum(notNaN(parseInt(typeof node === 'string' ? node : node.value, 16)));
    }

    evalEnum(node: nodes.EnumNode) {
        const enumType = this.getEnumType(node.enumType.value);
        return notUndefined(enumType, `No such enum: ${node.enumType.value}`).getValue(node.value.value);
    }

    evalIdentifier(node: nodes.IdentifierNode) {
        const name = node.value;
        assert(!isDiscarded(name), `${name} is discarded`);
        if (name in this.builtins) return this.builtins[name].get();
        if (name in this.vars) return this.vars[name];
        return notUndefined(this.getEnumValue(name), `No such identifier or enum value: ${name}`);
    }

    evalString(node: nodes.StringNode) {
        return new GalString(JSON.parse(`"${node.value}"`).toString());
    }

    evalArray(node: nodes.ArrayNode) {
        return new GalArray(node.value.map(value => this.evalNode(value)));
    }

    evalFunction(node: nodes.FunctionNode) {
        const func = node.func.value;
        if (func === 'hasVar') {
            const value = node.value;
            if (value.type !== 'identifier')
                throw new Error(`Function 'hasVar' can only be applied on identifier`);
            return BoolType.ofBool(tried(() => this.evalIdentifier(value)));
        }
        const value = this.evalNode(node.value);
        if (func in this.builtinFuncs) return this.builtinFuncs[func].apply(value);
        return notUndefined(this.getEnumType(func), `No such function: ${func}`).apply(value);
    }

    evalFactor(node: nodes.FactorOpNode) {
        return operators.applyUnary(node.operator, this.evalNode(node.value));
    }

    evalIndex(node: nodes.IndexNode) {
        return operators.applyBinary('[]', this.evalNode(node.value), this.evalNode(node.index));
    }

    evalLeftBinary(node: nodes.LeftBinaryNode) {
        const ops = (node.value.length - 1) / 2;
        let result = this.evalNode(node.value.at<0>(0));
        for (let i = 0; i < ops; i++) {
            const op = node.value.at<1>(2 * i + 1);
            const value = this.evalNode(node.value.at<0>(2 * i + 2));
            result = operators.applyBinary(op, result, value);
        }
        return result;
    }

    evalRightBinary(node: nodes.RightBinaryNode) {
        const ops = (node.value.length - 1) / 2;
        let result = this.evalNode(node.value.at<0>(-1));
        for (let i = ops - 1; i >= 0; i--) {
            const value = this.evalNode(node.value.at<0>(2 * i));
            const op = node.value.at<1>(2 * i + 1);
            result = operators.applyBinary(op, value, result);
        }
        return result;
    }

    evalComparing(node: nodes.ComparingNode) {
        const ops = (node.value.length - 1) / 2;
        for (let i = 0; i < ops; i++) {
            const left = this.evalNode(node.value.at<0>(2 * i));
            const op = node.value.at<1>(2 * i + 1);
            const right = this.evalNode(node.value.at<0>(2 * i + 2));
            if (!operators.applyBinary(op, left, right).toBool())
                return BoolType.ofBool(false);
        }
        return BoolType.ofBool(true);
    }

    evalMatching(node: nodes.MatchingOpNode) {
        const value = this.evalNode(node.value);
        const type = node.typeName.value;
        return BoolType.ofBool(value.matches.includes(type));
    }

    evalTriCondition(node: nodes.TriConditionOpNode) {
        return this.evalNode(node.condition).toBool() ? this.evalNode(node.left) : this.evalNode(node.right);
    }
}