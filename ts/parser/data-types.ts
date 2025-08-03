export class GalData { }

export class EmptyData extends GalData { }
export class CharacterData extends GalData {
    constructor(public name: string) {
        super();
    }
}
export class SpeechData extends GalData {
    constructor(public character: string, public sentence: string) {
        super();
    }
}
export class PartData extends GalData {
    constructor(public part: string) {
        super();
    }
}
export class NoteData extends GalData {
    constructor(public note: string) {
        super();
    }
}
export enum JumpType { Anchor, File, Link }
export class JumpData extends GalData {
    type;
    anchor;

    constructor(anchor: string) {
        super();
        if (anchor.startsWith('%')) {
            this.type = JumpType.Link;
            this.anchor = anchor.substring(1).trim();
        }
        else if (anchor.startsWith('>')) {
            this.type = JumpType.File;
            this.anchor = anchor.substring(1).trim();
        }
        else {
            this.type = JumpType.Anchor;
            this.anchor = anchor;
        }
    }
}
export class AnchorData extends GalData {
    constructor(public anchor: string) {
        super();
    }
}
export class SelectData extends GalData { }
export class CaseData extends GalData {
    show = 'true'; // Whether the player can see this choice
    enable = 'true'; // Whether the player can select this choice
    key?: string; // This case can be chosen with a key
    timeout?: string; // After how many seconds will the choice be directly chosen.

    // Note that arguments `timeout` and `key` are secretly undocumented.
    // They apply even if the choice is neither shown nor enabled.
    getArgs(): (keyof this & string)[] {
        return Object.keys(this).filter(key => key !== 'text') as (keyof this & string)[];
    }
    getPublicArgs() {
        return this.getArgs().filter(key => !['key', 'timeout'].includes(key));
    }
    constructor(public text: string, config: { [_: string]: string; }) {
        super();
        for (const key of this.getArgs())
            if (key in config) this[key] = config[key].trim() as this[keyof this & string];
    }
}
export class BreakData extends GalData { }
export class EndData extends GalData { }
export class VarData extends GalData {
    constructor(public name: string, public expr: string) {
        super();
    }
}
export class EnumData extends GalData {
    constructor(public name: string, public values: string[]) {
        super();
    }
}
export class SwitchData extends GalData {
    constructor(public expr: string) {
        super();
    }
}
export class InputData extends GalData {
    constructor(public valueVar: string, public errorVar: string) {
        super();
    }
}
export class ImageData extends GalData {
    constructor(public imageType: string, public imageFile: string) {
        super();
    }
}
export class TransformData extends GalData {
    translateX = '0px';
    translateY = '0px';
    scaleX = 1;
    scaleY = 1;
    skewX = 0;
    skewY = 0;
    rotate = 0;
    getArgs(): (keyof this & string)[] {
        return Object.keys(this).filter(key => !['type', 'imageType']
            .includes(key)) as (keyof this & string)[];
    }
    getAllArgs() {
        return [...new Set(
            this.getArgs().flatMap(key => ['X', 'Y'].includes(key.at(-1)!)
                ? [key] : [key, key.slice(0, -1)])
        )].sort();
    }
    constructor(public imageType: string, transformations?: { [_: string]: any; }) {
        super();
        if (transformations === undefined) return;
        for (const key of this.getArgs()) {
            if (key in transformations)
                this[key] = transformations[key];
            if (['X', 'Y'].includes(key.at(-1)!)) {
                const subKey = key.substring(0, key.length - 1);
                if (subKey in transformations)
                    this[key] = transformations[subKey];
            }
        }
    }
    toString() {
        return this.getArgs().map(arg => `${arg}(${this[arg]})`).map(s => s.replace(' ', '')).join(' ');
    }
}
export class DelayData extends GalData {
    constructor(public seconds: string = '0') {
        super();
    }
}
export class PauseData extends GalData { }
export class EvalData extends GalData {
    constructor(public expr: string) {
        super();
    }
}
export class FuncData extends GalData {
    constructor(public name: string, public args: string[]) {
        super();
    }
}
export class ReturnData extends GalData {
    constructor(public value: string) {
        super();
    }
}
export class CallData extends GalData {
    constructor(public name: string, public args: string[], public returnVar?: string) {
        super();
    }
}
export class ImportData extends GalData {
    constructor(public file: string, public names: string[]) {
        super();
    }
}
export class TextData extends GalData {
    constructor(public texts: string) {
        super();
    }
}
export class CodeData extends GalData {
    constructor(public language: string, public code: string) {
        super();
    }
}
