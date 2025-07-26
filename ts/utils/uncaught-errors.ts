import { GalIpcRenderer } from "../types";
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer as GalIpcRenderer;

import { logger } from "./logger.js";

function handler(error: any) {
    let exit = true;
    try {
        logger.error(error);
        const popup = exit = !logger.isDebug;
        if (!popup) return;
        const message = [
            'An unexpected error occured while Galosity was running:',
            error.toString(),
            `Press 'Confirm' to exit the program, and 'Cancel' to continue.`,
            `After pressing 'Cancel', you can press Ctrl+Alt+C to copy logs, or Ctrl+Alt+E to save them.`
        ].join('\n');
        exit = confirm(message);
    } catch (_) { /* Ignore */ }
    if (exit) ipcRenderer.invoke('exit', -1);
}

window.onerror = (...args) => handler(args.at(-1));
window.onunhandledrejection = event => handler(event.reason);

document.addEventListener('keyup', async event => {
    if (!event.ctrlKey || !event.altKey) return;
    if (event.key.toUpperCase() === 'C') return await logger.copy();
    if (event.key.toUpperCase() === 'E') return await logger.export();
});