class KeybindData {
    key: string;
    func: () => void;
    constructor(key: string, func: () => void) {
        this.key = key;
        this.func = func;
    }
}

export class KeybindManager {
    binds: KeybindData[] = [];
    bind(key: string, func: () => void) {
        this.binds.push(new KeybindData(key, func));
    }
    clear() {
        this.binds = [];
    }
    check(event: KeyboardEvent) {
        this.binds.filter(bind => bind.key === event.key).forEach(bind => bind.func());
    }
}