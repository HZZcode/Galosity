import { file } from "../editor/file-manager.js";
import { HandleError, WrapError } from "../utils/errors.js";

type Exports = Record<string, any>;

const exports: Exports = {};
window.galosity = exports as any;

export function exportObject(path: string[], object: any, root: Exports = exports) {
    path = path.map(name => name.toIdentifier());
    if (path.length === 0) return;
    if (path.length === 1) {
        root[path[0]] = object;
        return;
    }
    if (!(path[0] in root)) root[path[0]] = {};
    exportObject(path.slice(1), object, root[path[0]]);
}

const exportPack = HandleError(WrapError('Error exporting pack')(
    (pack: string) => exports[pack.toIdentifier()] = require(pack)
));

const exportFile = HandleError(WrapError('Error exporting pack')(
    async (space: string) => exportObject(space.split('/'), await import(`../${space}.js`))
));

const packs = ['lodash', 'uuid', 'crypto-js', 'highlight.js'];

async function getExportFiles() {
    return (await file.readFile('exports.txt')).splitLine().map(path => path.replace(/^\//, ''));
}

export async function exportAll() {
    for (const pack of packs) exportPack(pack);
    for (const file of await getExportFiles()) await exportFile(file);
}