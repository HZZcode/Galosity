import { ipcRenderer } from "../utils/runtime.js";
import { Runtime } from "../utils/runtime.js";
import type { Func } from "../utils/types.js";
import { exportAll, exportObject } from "./exports.js";
import { MetaInfo } from "./meta-info.js";

type Setup = Func<[MetaInfo], boolean | undefined>;

async function getPlugins() {
    const plugins = await ipcRenderer.invoke('readdir', 'plugins');
    return plugins.filter(async plugin => await ipcRenderer.invoke('exists', getPath(plugin)));
}

function getPath(plugin: string) {
    const count = Runtime.configs.packed ? 4 : 2; // Strange but just works
    return `${'../'.repeat(count)}plugins/${plugin}/index.js`;
}

class LoadResult {
    constructor(public plugin: string, public loaded: boolean, public error?: any) { }
}

async function tryLoadPlugin(plugin: string) {
    const path = getPath(plugin);
    try {
        const module = await import(path);
        const result = await (module.setup as Setup)(new MetaInfo());
        const loaded = result === undefined || !!result;
        if (loaded) exportObject(['plugins', plugin], module);
        return new LoadResult(plugin, loaded);
    } catch (e) {
        return new LoadResult(plugin, false, e);
    }
}

export async function loadPlugins(onError?: Func<[error: any], void>) {
    await exportAll();
    try {
        const results = await Promise.all((await getPlugins()).map(tryLoadPlugin));
        await setInfo(results.filter(result => result.loaded).map(result => result.plugin));
        const errors = results.filter(result => !result.loaded && result.error !== undefined)
            .map(result => `Failed to load plugin '${result.plugin}': ${result.error}`);
        if (errors.length !== 0) await onError?.(errors.join('\n'));
    } catch (e: any) {
        await onError?.(e);
    }
}

async function setInfo(loaded: string[]) {
    const env = Runtime.environment;
    await ipcRenderer.invoke(`${env}Title`, `Galosity ${env.capitalize()} (${info(loaded)})`);
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