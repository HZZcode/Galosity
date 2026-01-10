import type { API, Configs, Environment } from "../types.js";

export class Runtime {
    static configs: Configs = undefined!;
    static environment: Environment = undefined!;
    static get api() {
        return require('electron').ipcRenderer as API;
    }
}