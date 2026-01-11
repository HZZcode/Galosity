import { switchMode } from '../utils/mode.js';

await switchMode({
    electron: async () => await import('./electron/launch.js'),
    web: async () => await import('./web/launch.js')
});