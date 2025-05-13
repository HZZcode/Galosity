/**
 * About [Vars] System in Galosity
 * 
 * Types
 * - Num: numbers. can be calculated and compared.
 * - Enums: a value from several strings.
 */

const lodash = require('lodash');

function findDuplicates(array) {
    return array.filter((item, index) => array.indexOf(item) !== index);
}

function isIdentifier(str) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}

export class GalNum {
    type = 'num';
    value;
    constructor(value) {
        this.value = value;
    }

    toString() {
        return this.value.toString();
    }
}

export class GalEnumType {
    name;
    values; //list of string
    constructor(name, values) {
        this.name = name;
        this.values = values;

        let duplicates = findDuplicates(values);
        if (duplicates.length !== 0)
            throw `Found duplicate enum value: ${name}.${duplicates[0]}`
        
        if (!isIdentifier(name)) throw `Name of enum ${name} is invalid`;
        let nonIdentifiers = values.filter(value => !isIdentifier(value));
        if (nonIdentifiers.length !== 0)
            throw `Name of enum value ${name}.${nonIdentifiers[0]} is invalid`;
    }

    toString() {
        return `Enum Type ${this.name} with values ${this.values}`;
    }

    getValue(value) {
        return new GalEnum(this, value);
    }
}

export class GalEnum {
    type = 'enum';
    enumType;
    valueIndex;

    constructor(enumType, value) {
        this.enumType = enumType;
        if (value instanceof Number) this.valueIndex = value;
        else {
            let index = enumType.values.indexOf(value);
            if (index === -1)
                throw `value ${value} is not a legal value for enum ${enumType.name}: `
                + `must be a value in ${enumType.values}`;
            this.valueIndex = index;
        }
    }

    toString() {
        return `${this.enumType.name}.${this.enumType.values[this.valueIndex]}`;
    }
}

const BoolType = new GalEnumType('bool', ['true', 'false']);

export class GalVars {
    enumTypes = [BoolType];
    vars = {};

    copy() {
        return lodash.cloneDeep(this);
    }

    defEnumType(enumType) {
        if (this.enumTypes.some(type => type.name === enumType.name))
            throw `Multiple definition of enum type named ${enumType.name}`;
        this.enumTypes.push(enumType);
    }

    getEnumType(name) {
        return this.enumTypes.find(type => type.name === name);
    }

    // getEnumValue(name) {
    //     let found = [];
    //     for (let enumType of this.enumTypes)
    //         if (enumType.values.some(value => value === name))
    //             found.push(enumType);
    //     if (found !== 0) throw `No such enum value: ${name}`;
    // }

    getVar(name) {
        if (name in this.vars) return this.vars[name];
        throw `No such var named ${name}`;
    }

    evaluate(expr) {
        expr = expr.replaceAll(/\s/g, '');

        let numRegex = /^-?\d+(\.\d+)?$/;

        if (numRegex.test(expr))
            return new GalNum(parseFloat(expr));
        if (isIdentifier(expr))
            return this.getVar(expr); //TODO: auto enum type inference
        if (expr.search(/\./) !== -1) {
            let iter = expr.matchAll(/\./g);
            let dots = [];
            for (let pos of iter) dots.push(pos.index);
            if (dots.length === 1) {
                let dot = dots[0];
                let enumName = expr.substring(0, dot);
                let value = expr.substring(dot + 1);
                return this.getEnumType(enumName).getValue(value);
            }
        }
        throw `Unexpected expression: ${expr}`;
    }
}