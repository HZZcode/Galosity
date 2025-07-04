export class TimeoutManager {
    ids = [];

    set(callback, delay) {
        const id = setTimeout(callback, delay);
        this.ids.push(id);
        return id;
    }

    clear() {
        for (const id of this.ids)
            clearTimeout(id);
        this.ids = [];
    }
}