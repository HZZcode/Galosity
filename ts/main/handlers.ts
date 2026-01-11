import type { HandlerRegistry, Handlers } from '../types.js';
import { switchMode } from '../utils/mode.js';
import { Crypto } from './crypto.js';
import { Files } from './files.js';

export const handlers: Handlers = await switchMode({
    electron: async () => (await import('./electron/handlers.js')).ElectronHandlers,
    web: async () => (await import('./web/handlers.js')).WebHandlers
});

handlers.add('writeFile', (pathname: string, content: string) => Files.write(pathname, content));
handlers.add('writeFileEncrypted', (pathname: string, content: string) =>
    Crypto.writeEncrypted(pathname, content));
handlers.add('readFile', (pathname: string) => Files.read(pathname));
handlers.add('readFileDecrypted', (pathname: string) => Crypto.readDecrypted(pathname));
handlers.add('resolve', (pathname: string, directory?: string) => Files.resolve(pathname, directory));
handlers.add('directory', _ => Files.directory);
handlers.add('readdir', (pathname: string, withFileTypes = false) =>
    Files.readDir(pathname, withFileTypes));
handlers.add('exists', (pathname: string) => Files.exists(pathname));
handlers.add('delete', (pathname: string) => Files.delete(pathname));
handlers.add('add-handler', (registry: HandlerRegistry) =>
    handlers.add(registry.channel, (...args: any[]) =>
        new Function(...registry.args, registry.code)(...args)));