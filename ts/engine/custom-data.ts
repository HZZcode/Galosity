import { type Copy, Serializable } from '../utils/serialize.js';

@Serializable
export class CustomData implements Copy {
    [key: string]: unknown;

    constructor(object: object = {}) {
        if (object === undefined) return;
        for (const [key, value] of Object.entries(object))
            if (!(key in this)) this[key] = value;
    }

    toString() {
        return JSON.stringify(this);
    }

    static fromString(str: string) {
        return new CustomData(JSON.parse(str));
    }

    copy() {
        return CustomData.fromString(this.toString()) as this;
    }
}
