import type { HandlerRegistry } from "../types.js";
import { ipcRenderer } from "../utils/runtime.js";

export class Handlers {
    private constructor() { }

    static async add(registry: HandlerRegistry) {
        await ipcRenderer.invoke('add-handler', registry);
    }
}