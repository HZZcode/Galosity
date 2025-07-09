import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { logger } from "../utils/logger.js";
import { exportAll, exports } from "./exports.js";
import { MetaInfo } from "./meta-info.js";

export let finishLoading = false;

async function getPlugins() {
    const plugins = await ipcRenderer.invoke('readdir', 'plugins');
    return plugins.filter(async plugin => await ipcRenderer.invoke('exists', getPath(plugin)));
}

function getPath(plugin: string) {
    const count = logger.isDebug ? 2 : 4; // Strange but just works
    return `${'../'.repeat(count)}plugins/${plugin}/index.js`;
}

export async function tryLoadPlugin(plugin: string) {
    await exportAll();
    window.galosity = exports;
    const path = getPath(plugin);
    try {
        const plugin = await import(path);
        await plugin.setup(new MetaInfo());
        return true;
    } catch (e) {
        logger.error(`Failed to load plugin '${plugin}': ${e}`);
        return false;
    }
}

export async function loadPlugins() {
    const loaded: string[] = (await getPlugins())
        .filter(async plugin => await tryLoadPlugin(plugin));
    await setInfo(loaded);
    finishLoading = true;
}

async function setInfo(loaded: string[]) {
    await ipcRenderer.invoke('setTitle', `Galosity (${info(loaded)})`);
}

function info(loaded: string[]) {
    const length = loaded.length;
    loaded.sort();
    if (length === 0) return 'Vanilla';
    if (length === 1) return `Loaded Plugin: ${loaded[0]}`;
    if (length <= 3) return `Loaded ${length} Plugins: ${loaded.join(', ')}`;
    return `Loaded ${length} Plugins: ${loaded.slice(0, 1).join(', ')} +${length - 2} More`;
}