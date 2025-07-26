import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import "../utils/uncaught-errors.js";

import { logger } from '../utils/logger.js';
import { bindFunction, bindInput } from "../utils/bind-events.js";
import { errorHandled, error } from "./error-handler.js";
import { isNum } from "../utils/string.js";
import { jump, lineInput, evalButton, codeInput } from "./elements.js";
import { manager } from "./manager.js";
import { KeybindManager, KeyConfig, KeyType } from "../utils/keybind.js";
import { loadPlugins } from "../plugin/loader.js";
import { themes } from "../utils/color-theme.js";
import { isConfirming } from "../utils/confirm.js";

const initPromise = new Promise<void>((resolve, reject) => {
    ipcRenderer.on('engine-data', async (_, data) => {
        try {
            await loadPlugins(e => {
                logger.error(e);
                error.error(e);
            });
            await manager.set(data.content.splitLine());
            manager.resources.filename = data.filename;
            logger.isDebug = data.configs.isDebug;
            themes.set(data.configs.theme);
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

    bindInput(jump, lineInput, async () => {
        const index = lineInput.value;
        if (isNum(index)) await manager.jump(Number.parseInt(index));
    });

    bindInput(evalButton, codeInput, async () => {
        const code = codeInput.value;
        await manager.eval(code);
    });
}

// eslint-disable-next-line floatingPromise/no-floating-promise
main();