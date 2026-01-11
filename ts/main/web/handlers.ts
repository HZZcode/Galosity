import type { Listener } from '../../types.js';

export class WebHandlers {
    static handlers: Record<string, Listener> = {};
    private constructor() { }

    static add(channel: string, listener: Listener) {
        this.handlers[channel] = listener;
    }
}