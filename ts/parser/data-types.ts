export class GalData { }

export class EmptyData extends GalData { }
export class CharacterData extends GalData {
    name;
    constructor(name: string) {
        super();
        this.name = name;
    }
}
export class SpeechData extends GalData {
    character;
    sentence;
    constructor(character: string, sentence: string) {
        super();
        this.character = character;
        this.sentence = sentence;
    }
}
export class PartData extends GalData {
    part;
    constructor(part: string) {
        super();
        this.part = part;
    }
}
export class NoteData extends GalData {
    note;
    constructor(note: string) {
        super();
        this.note = note;
    }
}
export class JumpData extends GalData {
    href = false;
    crossFile = false;
    anchor;
    constructor(anchor: string) {
        super();
        if (anchor.startsWith('%')) {
            this.href = true;
            this.anchor = anchor.substring(1).trim();
        }
        else if (anchor.startsWith('>')) {
            this.crossFile = true;
            this.anchor = anchor.substring(1).trim();
        }
        else this.anchor = anchor;
    }
}
export class AnchorData extends GalData {
    anchor;
    constructor(anchor: string) {
        super();
        this.anchor = anchor;
    }
}
export class SelectData extends GalData { }
export class CaseData extends GalData {
    text;
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
    constructor(text: string, config: { [_: string]: string; }) {
        super();
        this.text = text;
        for (const key of this.getArgs())
            if (key in config) this[key] = config[key].trim() as this[keyof this & string];
    }
}
export class BreakData extends GalData { }
export class EndData extends GalData { }
export class VarData extends GalData {
    name;
    expr;
    constructor(name: string, expr: string) {
        super();
        this.name = name;
        this.expr = expr;
    }
}
export class EnumData extends GalData {
    name;
    values;
    constructor(name: string, values: string[]) {
        super();
        this.name = name;
        this.values = values;
    }
}
export class SwitchData extends GalData {
    expr;
    constructor(expr: string) {
        super();
        this.expr = expr;
    }
}
export class InputData extends GalData {
    valueVar;
    errorVar;
    constructor(valueVar: string, errorVar: string) {
        super();
        this.valueVar = valueVar;
        this.errorVar = errorVar;
    }
}
export class ImageData extends GalData {
    imageType;
    imageFile;
    constructor(imageType: string, imageFile: string) {
        super();
        this.imageType = imageType;
        this.imageFile = imageFile;
    }
}
export class TransformData extends GalData {
    imageType;
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
    constructor(imageType?: string, transformations?: { [_: string]: any; }) {
        super();
        this.imageType = imageType;
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
    seconds = '0';
    constructor(seconds: string) {
        super();
        this.seconds = seconds;
    }
}
export class PauseData extends GalData { }
export class EvalData extends GalData {
    expr;
    constructor(expr: string) {
        super();
        this.expr = expr;
    }
}
export class FuncData extends GalData {
    name;
    args;
    constructor(name: string, args: string[]) {
        super();
        this.name = name;
        this.args = args;
    }
}
export class ReturnData extends GalData {
    value;
    constructor(value: string) {
        super();
        this.value = value;
    }
}
export class CallData extends GalData {
    name;
    args;
    returnVar;
    constructor(name: string, args: string[], returnVar?: string) {
        super();
        this.name = name;
        this.args = args;
        this.returnVar = returnVar;
    }
}
export class ImportData extends GalData {
    file;
    names;
    constructor(file: string, names: string[]) {
        super();
        this.file = file;
        this.names = names;
    }
}

