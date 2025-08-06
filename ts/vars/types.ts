import { findDuplicates } from '../utils/array.js';
import { assert } from '../utils/assert.js';
import { splitWith } from '../utils/split.js';
import { isIdentifier } from '../utils/string.js';

export class GalVar {
    constructor(public type: string) { }

    getType() {
        return this.type;
    }

    toBool(): boolean {
        if (isBool(this)) return !!this.valueIndex;
        throw new Error(`Cannot convert ${this.getType()} into bool`);
    }
    toNum() {
        if (isNum(this)) return this.value;
        throw new Error(`Cannot convert ${this.getType()} into num`);
    }

    toString(): string {
        throw `'toString' is not implemented for ${this.getType()}`;
    }
    /** Note: `reprString` must ensure that `GalVars.evaluate(var.reprString())` is same as `var`. */
    reprString() {
        return this.toString();
    }
}

export class GalNum extends GalVar {
    constructor(public value: number) {
        super('num');
        assert(typeof value === 'number' && !isNaN(value), `Invalid num: ${value}`);
    }

    override getType() {
        return this.type;
    }

    override toString() {
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
    constructor(public name: string, public values: string[]) {
        const duplicates = findDuplicates(values);
        if (duplicates.length !== 0)
            throw new Error(`Found duplicate enum value: ${name}.${duplicates[0]}`);

        if (!isIdentifier(name)) throw new Error(`Name of enum ${name} is invalid`);
        const nonIdentifiers = values.filter(value => !isIdentifier(value));
        if (nonIdentifiers.length !== 0)
            throw new Error(`Name of enum value ${name}.${nonIdentifiers[0]} is invalid`);
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
        if (index >= this.values.length) throw new Error(`Enum index out of bound: ${index}`);
        return GalEnum.fromString(this, this.values[index]);
    }

    apply(value: GalVar) {
        if (!isNum(value)) throw new Error(`Cannot convert from ${value.getType()} to ${this.name}`);
        const num = value.value;
        const index = Math.round(num);
        if (Math.abs(num - index) < 1e-5) return this.ofIndex(index);
        throw new Error(`Cannot convert non-integer into enum ${this.name}`);
    }
}

export class GalEnum extends GalVar {
    constructor(public enumType: GalEnumType, public valueIndex: number) {
        super('enum');
    }

    static fromString(enumType: GalEnumType, value: string) {
        const index = enumType.values.indexOf(value);
        if (index === -1)
            throw new Error(`value ${value} is not a legal value for enum ${enumType.name}: `
                + `must be a value in ${enumType.values}`);
        return new GalEnum(enumType, index);
    }

    override getType() {
        return this.enumType.name;
    }

    getName() {
        return this.enumType.values[this.valueIndex];
    }

    override toString() {
        return `${this.enumType.name}.${this.getName()}`;
    }
}
class GalBoolEnumType extends GalEnumType {
    constructor() {
        super('bool', ['false', 'true']);
    }
    ofBool(b: boolean) {
        return this.getValue(b ? 'true' : 'false');
    }
}

export const BoolType = new GalBoolEnumType();

export class GalString extends GalVar {
    constructor(public value: string) {
        super('string');
        assert(typeof value === 'string', `Invalid string: ${value}`);
    }

    override toString(): string {
        return this.value;
    }

    override reprString(): string {
        return `'${this.value}'`;
    }
}

export class GalArray extends GalVar {
    constructor(public value: GalVar[]) {
        super('array');
    }

    override toString(): string {
        return '{' + this.value.map(value => value.toString()).join(',') + '}';
    }

    override reprString(): string {
        return '{' + this.value.map(value => value.reprString()).join(',') + '}';
    }
}

export function isNum(value: GalVar): value is GalNum {
    return value.type === 'num';
}

export function isEnum(value: GalVar): value is GalEnum {
    return value.type === 'enum';
}

export function isBool(value: GalVar): value is GalEnum {
    return isEnum(value) && value.enumType.name === 'bool';
}

export function isString(value: GalVar): value is GalString {
    return value.type === 'string';
}

export function isArray(value: GalVar): value is GalArray {
    return value.type === 'array';
}