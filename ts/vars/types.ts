import { splitWith } from '../utils/split.js';
import { findDuplicates } from '../utils/array.js';
import { isIdentifier } from '../utils/string.js';

export class GalVar {
    constructor(public type: string) { }
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
    constructor(public value: number) {
        super('num');
        if (isNaN(value)) throw 'Num cannot be NaN';
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
    constructor(public name: string, public values: string[]) {
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
    constructor(public enumType: GalEnumType, public valueIndex: number) {
        super('enum');
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
        return this.getValue(b ? 'true' : 'false');
    }
}

export const BoolType = new GalBoolEnumType();

export function isNum(value: GalVar): value is GalNum {
    return value.type === 'num';
}

export function isEnum(value: GalVar): value is GalEnum {
    return value.type === 'enum';
}

export function isBool(value: GalVar): value is GalEnum {
    return isEnum(value) && value.enumType.name === 'bool';
}