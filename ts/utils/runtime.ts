import type { Configs, Environment, GalIpcRenderer } from "../types.js";

export const ipcRenderer = require('electron').ipcRenderer as GalIpcRenderer;

export class Runtime {
    static configs: Configs = undefined!;
    static environment: Environment = undefined!;
}