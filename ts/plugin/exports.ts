import { file } from "../editor/file-manager.js";
import { logger } from "../utils/logger.js";

type Exports = Record<string, any>;

export const exports: Exports = {};

function exportObject(path: string[], object: any, root: Exports = exports) {
    path = path.map(name => name.toIdentifier());
    if (path.length === 0) return;
    if (path.length === 1) {
        root[path[0]] = object;
        return;
    }
    if (!(path[0] in root)) root[path[0]] = {};
    exportObject(path.slice(1), object, root[path[0]]);
}

function exportPack(pack: string) {
    try {
        exports[pack.toIdentifier()] = require(pack);
    } catch (e) {
        logger.error(`Error exporting ${pack}: ${e}`);
    }
}

async function exportFile(space: string) {
    try {
        const path = space.split('/');
        exportObject(path, await import(`../${space}.js`));
    } catch (e) {
        logger.error(`Error exporting ${space}: ${e}`);
    }
}

const packs = ['electron', 'lodash', 'uuid', 'crypto-js'];

async function getExportFiles() {
    return (await file.readFile('exports.txt')).splitLine().map(path => path.replace(/^\//, ''));
}

export async function exportAll() {
    for (const pack of packs) exportPack(pack);
    for (const file of await getExportFiles()) await exportFile(file);
}

declare global {
    interface Window {
        galosity: Exports;
    }
}