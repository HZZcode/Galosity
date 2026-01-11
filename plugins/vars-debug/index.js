/* eslint-disable no-console */
/// <reference path='../../dts/exports.d.ts' />

let enabled = false;

/** @param {galosity.plugin.metaInfo.MetaInfo} info */
export function setup(info) {
    info.version.atLeast('2.4');
    if (info.environment !== 'engine' || !info.isDebug) return false;

    const GalVars = galosity.vars.vars.GalVars;
    const originalSetVar = GalVars.prototype.setVar;
    /** 
     * @param {string} name 
     * @param {galosity.vars.types.GalVar} value 
     * */
    GalVars.prototype.setVar = function (name, value) {
        originalSetVar.call(this, name, value);
        if (enabled) {
            console.clear();
            console.table(Object.fromEntries(Object.entries(this.vars)
                .map(entry => [entry[0], entry[1].toString()])));
        }
    };

    return true;
}

/** @param {boolean} value */
export const enable = value => enabled = value;