export function parseBool(str: string) {
    if (typeof str === 'boolean') return str;
    switch (str) {
        case 'true': return true;
        case 'false': return false;
        default: throw `Invalid Boolean: '${str}'`;
    }
}