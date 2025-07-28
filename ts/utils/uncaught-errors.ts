import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { logger } from "./logger.js";

function noExcept(func: () => void) {
    try {
        func();
    } catch (_) { /* Ignore */ }
}

async function handler(error: any) {
    let exit = true, popup = true;
    noExcept(() => {
        logger.error(error);
        popup = exit = !logger.isDebug;
    });
    noExcept(() => {
        if (!popup) return;
        const message = [
            'An unexpected error occured while Galosity was running:',
            error.toString(),
            `Press 'Confirm' to exit the program, and 'Cancel' to continue.`,
            `After pressing 'Cancel', you can press Ctrl+Alt+C to copy logs, or Ctrl+Alt+E to save them.`
        ].join('\n');
        exit = confirm(message);
    });
    if (exit) await ipcRenderer.invoke('exit', -1);
}

window.onerror = async (...args) => await handler(args.at(-1));
window.onunhandledrejection = async event => await handler(event.reason);

document.addEventListener('keyup', async event => {
    if (!event.ctrlKey || !event.altKey) return;
    switch (event.key.toUpperCase()) {
        case 'C': return await logger.copy();
        case 'E': return await logger.export();
        case 'X': throw `Uncaught Exception Test`;
    }
});