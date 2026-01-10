import { Runtime } from '../runtime/runtime.js';
import type { HandlerRegistry } from '../types.js';

export class Handlers {
    private constructor() { }

    static async add(registry: HandlerRegistry) {
        await Runtime.api.invoke('add-handler', registry);
    }
}