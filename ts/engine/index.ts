import "../utils/uncaught-errors.js";

import { loadPlugins } from "../plugin/loader.js";
import { bindFunction, bindInput } from "../utils/bind-events.js";
import { themes } from "../utils/color-theme.js";
import { isConfirming } from "../utils/confirm.js";
import { Files } from "../utils/files.js";
import { KeybindManager, KeyConfig, KeyType } from "../utils/keybind.js";
import { logger } from '../utils/logger.js';
import { ipcRenderer, Runtime } from "../utils/runtime.js";
import { isNum } from "../utils/string.js";
import { codeInput,evalButton, jump, lineInput } from "./elements.js";
import { error,errorHandled } from "./error-handler.js";
import { manager } from "./manager.js";

const initPromise = new Promise<void>((resolve, reject) => {
    ipcRenderer.on('engine-data', async (_, data) => {
        try {
            Runtime.configs = data.configs;
            await loadPlugins(e => {
                logger.error(e);
                error.error(e);
            });
            const content = data.filename === undefined ? ''
                : await new Files().readFileDecrypted(data.filename);
            await manager.set(content.splitLine());
            manager.resources.filename = data.filename;
            themes.set(Runtime.configs.theme);
            resolve();
        } catch (e) {
            logger.error(e);
            error.error(e);
            reject(e);
        }
    });
});

async function main() {
    await initPromise;

    const keybind = new KeybindManager();
    keybind.bind(KeyType.of('Backspace'), manager.previous.bind(manager));
    keybind.bind(KeyType.of('Enter'), manager.next.bind(manager));
    keybind.bind(KeyType.of('d', KeyConfig.Ctrl), async () => await manager.SLScreen.show());
    keybind.bind(KeyType.of('t', KeyConfig.Alt), themes.next.bind(themes));

    window.addEventListener('keydown', errorHandled(async event => {
        if ((event.target as HTMLElement).tagName.toLowerCase() === 'input' || isConfirming) return;
        else if (manager.SLScreen.shown) await manager.SLScreen.keybind.apply(event);
        else if (await keybind.apply(event) || await manager.keybind.apply(event))
            event.preventDefault();
    }));

    bindFunction('previous', errorHandled(manager.previous.bind(manager)));
    bindFunction('next', errorHandled(manager.next.bind(manager)));

    if (Runtime.configs.scriptTest) {
        bindInput(jump, lineInput, async () => {
            const index = lineInput.value;
            if (isNum(index)) await manager.jump(Number.parseInt(index));
        });

        bindInput(evalButton, codeInput, async () => {
            const code = codeInput.value;
            await manager.eval(code);
        });
    }
    else hideElements('script-test');
}

function hideElements(classNames: string) {
    [...document.getElementsByClassName(classNames)]
        .forEach(element => (element as HTMLElement).style.display = 'none');
}

// eslint-disable-next-line floatingPromise/no-floating-promise
main();