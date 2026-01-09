import { findDuplicates } from '../utils/array.js';
import { assert } from '../utils/assert.js';
import { AutoBind } from '../utils/auto-bind.js';
import { splitWith } from '../utils/split.js';
import { isIdentifier } from '../utils/string.js';

export abstract class GalVar {
    constructor(public type: string) { }

    getType() {
        return this.type;
    }

    toBool(): boolean {
        if (isBool(this)) return !!this.valueIndex;
        throw new Error(`Cannot convert ${this.getType()} into bool`);
    }
    toNum(): number {
        throw new Error(`Cannot convert ${this.getType()} into num`);
    }

    abstract toString(): string;
    /** Note: `reprString` must ensure that `GalVars.evaluate(var.reprString())` is same as `var`. */
    reprString() {
        return this.toString();
    }

    abstract equals(_: GalVar): boolean;

    abstract get matches(): string[];

    get len(): number {
        throw new Error(`Cannot get length of ${this.getType()}`);
    } // Note: naming this to `length` confuses lodash
}

export abstract class GalSequence extends GalVar {
    abstract getIndex(index: number): GalVar;
    abstract setIndex(index: number, value: GalVar): void;
    abstract combine(other: this): GalVar;
    abstract repeat(count: number): GalVar;
}

export class GalNum extends GalVar {
    constructor(public value: number) {
        super('num');
        assert(typeof value === 'number' && !isNaN(value), `Invalid num: ${value}`);
    }

    override getType() {
        return this.type;
    }

    override toNum() {
        return this.value;
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

    override equals(other: GalVar) {
        return other instanceof GalNum && this.toString() === other.toString();
    }

    override get matches() {
        return ['num'];
    }
}

@AutoBind
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

    override equals(other: GalVar) {
        return other instanceof GalEnum
            && this.enumType.name === other.enumType.name
            && this.valueIndex === other.valueIndex;
    }

    override get matches() {
        return ['enum', this.getType()];
    }

    override get len() {
        return this.enumType.values.length;
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

export class GalString extends GalSequence {
    constructor(public value: string) {
        super('string');
        assert(typeof value === 'string', `Invalid string: ${value}`);
    }

    override toString() {
        return this.value;
    }

    override reprString() {
        return `'${this.value}'`;
    }

    override equals(other: GalVar) {
        return other instanceof GalString && this.value === other.value;
    }

    override get matches() {
        return ['string'];
    }

    override get len() {
        return this.value.length;
    }

    override getIndex(index: number) {
        return new GalString(this.value[index]);
    }

    override setIndex(index: number, value: GalVar) {
        if (!isString(value))
            throw new Error(`Cannot set index of ${this.getType()} into ${value.getType()}`);
        const char = value.value;
        assert(char.length === 1,
            `Cannot set index of ${this.getType()} into string with length ${char.length}`);
        assert(Number.isInteger(index) && index >= 0 && index < this.value.length,
            `Cannot set index ${index} of ${this.reprString()}`);
        this.value = this.value.substring(0, index) + char + this.value.substring(index + 1);
    }

    override combine(other: GalString) {
        return new GalString(this.value + other.value);
    }

    override repeat(count: number) {
        return new GalString(this.value.repeat(count));
    }
}

export class GalArray extends GalSequence {
    constructor(public value: GalVar[]) {
        super('array');
    }

    override toString() {
        return '{' + this.value.map(value => value.toString()).join(',') + '}';
    }

    override reprString() {
        return '{' + this.value.map(value => value.reprString()).join(',') + '}';
    }

    override equals(other: GalVar) {
        return other instanceof GalArray && this.value.length === other.value.length
            && this.value.map((value, index) => value.equals(other.value[index])).all();
    }

    override get matches() {
        return ['array'];
    }

    override get len() {
        return this.value.length;
    }

    override getIndex(index: number) {
        return this.value[index];
    }

    override setIndex(index: number, value: GalVar) {
        assert(Number.isInteger(index) && index >= 0 && index <= this.value.length,
            `Cannot set index ${index} of ${this.reprString()}`);
        this.value[index] = value;
    }

    override combine(other: GalArray) {
        return new GalArray([...this.value, ...other.value]);
    }

    override repeat(count: number) {
        return new GalArray(this.value.repeat(count));
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