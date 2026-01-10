type Listener<K extends keyof HTMLElementEventMap> = (this: HTMLElement, ev: HTMLElementEventMap[K]) => any;

class ListenerData {
    private constructor(public type: any, public listener: Listener<any>,
        public options?: boolean | AddEventListenerOptions) { }

    static of<K extends keyof HTMLElementEventMap>
        (type: K, listener: Listener<K>, options?: boolean | AddEventListenerOptions) {
        return new ListenerData(type, listener, options);
    }
}

export class EventListener<T extends HTMLElement> {
    listeners: ListenerData[] = [];

    constructor(public element: T) { }

    add<K extends keyof HTMLElementEventMap>(type: K, listener: Listener<K>,
        options?: boolean | AddEventListenerOptions) {
        this.listeners.push(ListenerData.of(type, listener, options));
        this.element.addEventListener(type, listener, options);
    }

    clear() {
        for (const listener of this.listeners)
            this.element.removeEventListener(listener.type, listener.listener, listener.options);
        this.listeners = [];
    }
}