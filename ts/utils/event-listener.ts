type Listener<K extends keyof HTMLElementEventMap> = (this: HTMLElement, ev: HTMLElementEventMap[K]) => any;

class ListenerData {
    type;
    listener;
    options;

    private constructor(type: any, listener: Listener<any>, options?: boolean | AddEventListenerOptions) {
        this.type = type;
        this.listener = listener;
        this.options = options;
    }

    static of<K extends keyof HTMLElementEventMap>
        (type: K, listener: Listener<K>, options?: boolean | AddEventListenerOptions) {
        return new ListenerData(type, listener, options);
    }
}

export class EventListener<T extends HTMLElement> {
    element;
    listeners: ListenerData[] = [];

    constructor(element: T) {
        this.element = element;
    }

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