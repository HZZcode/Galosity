import type { Configs, GalIpcRenderer } from "../types";

export const ipcRenderer = require('electron').ipcRenderer as GalIpcRenderer;

export class Runtime {
    static configs: Configs = undefined!;
}