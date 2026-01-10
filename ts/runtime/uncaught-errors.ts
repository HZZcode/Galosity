import { logger } from './logger.js';
import { Runtime } from './runtime.js';

class TestError extends Error { }

function noExcept(func: () => void) {
    try {
        func();
    } catch (_) { /* Ignore */ }
}

async function handler(error: any) {
    let exit = true, popup = true;
    noExcept(() => {
        logger.error(error);
        popup = exit = !Runtime.configs.isDebug || error instanceof TestError;
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
    if (exit) await Runtime.api.exit(-1);
}

window.onerror = async (...args) => await handler(args.at(-1));
window.onunhandledrejection = async event => await handler(event.reason);

document.addEventListener('keyup', async event => {
    if (!event.ctrlKey || !event.altKey) return;
    switch (event.key.toUpperCase()) {
        case 'C': return await logger.copy();
        case 'E': return await logger.export();
        case 'X': throw new TestError(`Uncaught Exception Test`, { cause: new Error('Just a Test') });
    }
});