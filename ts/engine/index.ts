import "../runtime/uncaught-errors.js";

import { loadPlugins } from "../plugin/loader.js";
import { bindFunction, bindInput } from "../runtime/bind-events.js";
import { themes } from "../runtime/color-theme.js";
import { isConfirming } from "../runtime/confirm.js";
import { HandleError } from "../runtime/errors.js";
import { Files } from "../runtime/files.js";
import { KeybindManager, KeyConfig, KeyType } from "../runtime/keybind.js";
import { Runtime } from "../runtime/runtime.js";
import { isNum } from "../utils/string.js";
import { manager } from "./manager.js";

const main = HandleError(async () => {
    if (Runtime.environment !== 'engine') return;
    await Runtime.initAPI();
    const data = await Runtime.api.initData('engine');
    Runtime.configs = data.configs;
    await loadPlugins();
    const content = data.filename === undefined ? ''
        : await new Files().readFileDecrypted(data.filename);
    await manager.set(content.splitLine());
    manager.resources.filename = data.filename;
    themes.set(Runtime.configs.theme);
    Runtime.api.onClose();

    const keybind = new KeybindManager();
    keybind.bind(KeyType.of('Backspace'), manager.previous);
    keybind.bind(KeyType.of('Enter'), manager.next);
    keybind.bind(KeyType.of('d', KeyConfig.Ctrl), manager.SLScreen.show);
    keybind.bind(KeyType.of('t', KeyConfig.Alt), themes.next);

    window.addEventListener('keydown', HandleError(async event => {
        if ((event.target as HTMLElement).tagName.toLowerCase() === 'input' || isConfirming) return;
        else if (manager.SLScreen.shown) await manager.SLScreen.keybind.apply(event);
        else if (await keybind.apply(event) || await manager.keybind.apply(event))
            event.preventDefault();
    }));

    bindFunction('previous', HandleError(manager.previous));
    bindFunction('next', HandleError(manager.next));

    if (Runtime.configs.scriptTest) bindScriptTests();
    else hideElements('script-test');
});

function bindScriptTests() {
    bindInput('jump', 'line', async index => isNum(index) ? await manager.jump(parseInt(index)) : void 0);
    bindInput('eval', 'code', manager.eval);
}

function hideElements(classNames: string) {
    [...document.getElementsByClassName(classNames)]
        .forEach(element => (element as HTMLElement).style.display = 'none');
}

main();