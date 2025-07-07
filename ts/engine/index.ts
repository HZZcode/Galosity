import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { logger } from '../utils/logger.js';
import { bindFunction, bindInput } from "../utils/bind-events.js";
import { errorHandled, error } from "./error-handler.js";
import { isNum } from "../utils/string.js";
import { jump, lineInput, evalButton, codeInput } from "./elements.js";
import { Manager } from "./manager.js"; 
import { registerProcessors } from "./processors.js";

const manager = new Manager(true, registerProcessors);

const initPromise = new Promise<void>((resolve, reject) => {
    ipcRenderer.on('test-data', async (_, data) => {
        try {
            await manager.set(data.content.split(/\r?\n/));
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

    window.addEventListener('keydown', errorHandled(async event => {
        if ((event.target as HTMLElement).tagName.toLowerCase() === 'input') return;
        const key = event.key;
        if (key === 'Backspace') await manager.previous();
        else if (key === 'Enter') await manager.next();
        // else if (event.ctrlKey && key.toLowerCase() === 's') await manager.save();
        // else if (event.ctrlKey && key.toLowerCase() === 'l') await manager.load();
        else manager.keybind.check(event);
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
// TODO: Tip before jumping
// TODO: save & load
// TODO: search & replace
// TODO: import funcs

// eslint-disable-next-line floatingPromise/no-floating-promise
main();