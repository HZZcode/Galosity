import type { HandlerRegistry } from '../types.js';
import { Crypto } from './crypto.js';
import { Files } from './files.js';

export const Handlers = (await import('./electron/handlers.js')).ElectronHandlers;

Handlers.add('writeFile', (pathname: string, content: string) => Files.write(pathname, content));
Handlers.add('writeFileEncrypted', (pathname: string, content: string) =>
    Crypto.writeEncrypted(pathname, content));
Handlers.add('readFile', (pathname: string) => Files.read(pathname));
Handlers.add('readFileDecrypted', (pathname: string) => Crypto.readDecrypted(pathname));
Handlers.add('resolve', (pathname: string, directory?: string) => Files.resolve(pathname, directory));
Handlers.add('directory', _ => Files.directory);
Handlers.add('readdir', (pathname: string, withFileTypes = false) =>
    Files.readDir(pathname, withFileTypes));
Handlers.add('exists', (pathname: string) => Files.exists(pathname));
Handlers.add('delete', (pathname: string) => Files.delete(pathname));
Handlers.add('add-handler', (registry: HandlerRegistry) =>
    Handlers.add(registry.channel, (...args: any[]) =>
        new Function(...registry.args, registry.code)(...args)));