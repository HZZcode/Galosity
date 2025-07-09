import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { logger } from "../utils/logger.js";
import { exportAll, exports } from "./exports.js";

async function getPlugins() {
    const plugins = await ipcRenderer.invoke('readdir', 'plugins');
    return plugins.map(plugin => `../../plugins/${plugin}/index.js`)
        .filter(async path => await ipcRenderer.invoke('exists', path));
}

export async function loadPlugin(path: string) {
    await exportAll();
    window.galosity = exports;
    try {
        const plugin = await import(path);
        plugin.setup();
    } catch (e) {
        logger.error(`Failed to load plugin at ${path}: ${e}`);
    }
}

export async function loadPlugins() {
    for (const plugin of await getPlugins()) await loadPlugin(plugin);
}