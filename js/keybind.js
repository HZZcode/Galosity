class KeybindData {
    key;
    func;
    constructor(key, func) {
        this.key = key;
        this.func = func;
    }
}

export class KeybindManager {
    binds = [];
    bind(key, func) {
        this.binds.push(new KeybindData(key, func));
    }
    clear() {
        this.binds = [];
    }
    check(event) {
        this.binds.filter(bind => bind.key === event.key).forEach(bind => bind.func());
    }
}