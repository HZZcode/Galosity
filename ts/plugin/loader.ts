import { Runtime } from "../runtime/runtime.js";
import type { Func } from "../utils/types.js";
import { exportAll, exportObject } from "./exports.js";
import { MetaInfo } from "./meta-info.js";

type Setup = Func<[MetaInfo], boolean | undefined>;

async function getPlugins() {
    const plugins = await Runtime.api.invoke('readdir', 'plugins');
    return plugins.filter(async plugin => await Runtime.api.invoke('exists', getPath(plugin)));
}

function getPath(plugin: string) {
    const count = Runtime.configs.packed ? 4 : 2; // Strange but just works
    return `${'../'.repeat(count)}plugins/${plugin}/index.js`;
}

export interface Setupable {
    setup(): Promise<void>;
};

class Plugin implements Setupable {
    private constructor(public plugin: string, private setupFunc: Setup,
        private module: any, public result?: LoadResult | undefined) { }

    static async of(plugin: string) {
        const path = getPath(plugin);
        try {
            const module = await import(path);
            return new Plugin(plugin, module.setup as Setup, module);
        } catch (e) {
            return new Plugin(plugin, undefined!, undefined!, new LoadResult(plugin, false, e));
        }
    }

    isLoaded() {
        return this.result !== undefined;
    }

    async setup() {
        if (this.isLoaded()) return;
        try {
            const result = await this.setupFunc(new MetaInfo());
            const loaded = result === undefined || !!result;
            if (loaded) exportObject(['plugins', this.plugin], this.module);
            this.result = new LoadResult(this.plugin, loaded);
        } catch (e) {
            this.result = new LoadResult(this.plugin, false, e);
        }
    }
}

class LoadResult {
    constructor(public plugin: string, public loaded: boolean, public error?: any) { }
}

export async function loadPlugins() {
    await exportAll();
    const setups: Record<string, Plugin> = {};
    for (const name of await getPlugins()) {
        const plugin = await Plugin.of(name);
        setups[name.toIdentifier()] = plugin;
    }
    window.galosity.pluginSetups = setups;
    const plugins = Object.values(setups);

    await Promise.all(plugins.map(plugin => plugin.setup()));
    const results = plugins.map(plugin => plugin.result!);
    await setInfo(results.filter(result => result.loaded).map(result => result.plugin));
    const errors = results.filter(result => !result.loaded && result.error !== undefined)
        .map(result => `Failed to load plugin '${result.plugin}': ${result.error}`);
    if (errors.length !== 0) throw new Error(errors.join('\n'));
}

async function setInfo(loaded: string[]) {
    const env = Runtime.environment;
    await Runtime.api.invoke(`${env}Title`, `Galosity ${env.capitalize()} (${info(loaded)})`);
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