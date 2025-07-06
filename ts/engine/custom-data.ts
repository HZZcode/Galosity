export class CustomData {
    [key: string]: any;

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
}
