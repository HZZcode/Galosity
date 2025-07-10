import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { logger } from '../utils/logger.js';
import { bindFunction, bindInput } from "../utils/bind-events.js";
import { errorHandled, error } from "./error-handler.js";
import { isNum } from "../utils/string.js";
import { jump, lineInput, evalButton, codeInput } from "./elements.js";
import { Manager } from "./manager.js";
import { KeybindManager, KeyType } from "../utils/keybind.js";
import { loadPlugins } from "../plugin/loader.js";

const manager = new Manager(true);

const initPromise = new Promise<void>((resolve, reject) => {
    ipcRenderer.on('test-data', async (_, data) => {
        try {
            await loadPlugins(e => {
                logger.error(e);
                error.error(e);
            });
            await manager.set(data.content.splitLine());
            manager.resources.filename = data.filename;
            logger.isDebug = data.isDebug;
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

    window.addEventListener('keydown', errorHandled(async event => {
        if ((event.target as HTMLElement).tagName.toLowerCase() === 'input') return;
        if (await keybind.apply(event) || await manager.keybind.apply(event))
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