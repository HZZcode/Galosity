import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { logger } from "../utils/logger.js";
import { Func } from "../utils/types.js";
import { exportAll, exports } from "./exports.js";
import { MetaInfo } from "./meta-info.js";

async function getPlugins() {
    const plugins = await ipcRenderer.invoke('readdir', 'plugins');
    return plugins.filter(async plugin => await ipcRenderer.invoke('exists', getPath(plugin)));
}

function getPath(plugin: string) {
    const count = logger.isDebug ? 2 : 4; // Strange but just works
    return `${'../'.repeat(count)}plugins/${plugin}/index.js`;
}

class LoadResult {
    plugin;
    loaded;
    error;

    constructor(plugin: string, loaded: boolean, error?: any) {
        this.plugin = plugin;
        this.loaded = loaded;
        this.error = error;
    }
}

export async function tryLoadPlugin(plugin: string) {
    await exportAll();
    window.galosity = exports;
    const path = getPath(plugin);
    try {
        const result = await (await import(path)).setup(new MetaInfo()) as boolean | undefined;
        return new LoadResult(plugin, result === undefined || !!result);
    } catch (e) {
        return new LoadResult(plugin, false, e);
    }
}

export async function loadPlugins(onError?: Func<[error: string], void>) {
    const results = await Promise.all((await getPlugins()).map(async plugin => await tryLoadPlugin(plugin)));
    await setInfo(results.filter(result => result.loaded).map(result => result.plugin));
    const errors = results.filter(result => !result.loaded && result.error !== undefined)
        .map(result => `Failed to load plugin '${result.plugin}': ${result.error}`);
    if (onError !== undefined && errors.length !== 0) await onError(errors.join('\n'));
}

async function setInfo(loaded: string[]) {
    await ipcRenderer.invoke('editorTitle', `Galosity (${info(loaded)})`);
    await ipcRenderer.invoke('engineTitle', `Galosity Engine (${info(loaded)})`);
}

function info(loaded: string[]) {
    const maxInfo = 2;
    const length = loaded.length;
    loaded.sort();
    if (length === 0) return 'Vanilla';
    if (length === 1) return `Loaded Plugin: ${loaded[0]}`;
    if (length <= maxInfo + 1) return `Loaded ${length} Plugins: ${loaded.join(', ')}`;
    return `Loaded ${length} Plugins: ${loaded.slice(0, maxInfo).join(', ')} +${length - maxInfo} More`;
}