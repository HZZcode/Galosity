import { sum } from "./array.js";
import { Func } from "./types.js";

export enum KeyConfig {
    Ctrl = 1 << 0,
    Shift = 1 << 1,
    Alt = 1 << 2,
    Meta = 1 << 3
}

export class KeyType {
    ctrl;
    shift;
    alt;
    meta;
    key;

    constructor(ctrl: boolean, shift: boolean, alt: boolean, meta: boolean, key: string) {
        this.ctrl = ctrl;
        this.shift = shift;
        this.alt = alt;
        this.meta = meta;
        this.key = key;
    }

    static of(key: string, config: number = 0) {
        const ctrl = (config & KeyConfig.Ctrl) !== 0;
        const shift = (config & KeyConfig.Shift) !== 0;
        const alt = (config & KeyConfig.Alt) !== 0;
        const meta = (config & KeyConfig.Meta) !== 0;
        return new KeyType(ctrl, shift, alt, meta, key);
    }

    match(event: KeyboardEvent) {
        return [
            event.key.toLowerCase() === this.key.toLowerCase(),
            !this.ctrl || event.ctrlKey,
            !this.shift || event.shiftKey,
            !this.alt || event.altKey,
            !this.meta || event.metaKey
        ].all();
    }

    constraints() {
        return sum([this.ctrl, this.shift, this.alt, this.meta] as unknown[] as number[]);
    }
}

class KeybindData {
    key: KeyType;
    func: Func<[], void>;

    constructor(key: KeyType, func: Func<[], void>) {
        this.key = key;
        this.func = func;
    }

    match(event: KeyboardEvent) {
        return this.key.match(event);
    }
}

export class KeybindManager {
    private binds: KeybindData[] = [];

    bind(key: KeyType, func: Func<[], void>) {
        this.binds.push(new KeybindData(key, func));
        return this;
    }

    clear() {
        this.binds = [];
    }

    async apply(event: KeyboardEvent): Promise<boolean> {
        const found = this.binds.filter(bind => bind.match(event));
        for (const bind of found.maxs(bind => bind.key.constraints())) await bind.func();
        return found.length !== 0;
    }
}