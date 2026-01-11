import { switchMode } from '../mode.js';

await switchMode({
    electron: async () => await import('./electron/launch.js'),
    web: async () => await import('./web/launch.js')
});