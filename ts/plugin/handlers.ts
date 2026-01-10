import type { HandlerRegistry } from "../types.js";
import { Runtime } from "../utils/runtime.js";

export class Handlers {
    private constructor() { }

    static async add(registry: HandlerRegistry) {
        await Runtime.api.invoke('add-handler', registry);
    }
}