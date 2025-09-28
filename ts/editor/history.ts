const { v4: uuid } = require('uuid');

import { assert } from "../utils/assert.js";

export const editTag = () => `Edit #${uuid()}`;

export class Lines {
    get length() {
        return this.maxLine - this.minLine + 1;
    }
    constructor(public minLine: number, public maxLine: number, public lines: string[]) {
        assert(lines.length === this.length);
    }
    static single(line: number, text: string) {
        return new Lines(line, line, [text]);
    }
}

export class EditData {
    time = new Date();
    constructor(public befores: Lines, public afters: string[], public tag?: string) { }
    static empty() {
        return new EditData(new Lines(0, -1, []), []);
    }
    isEmpty() {
        return this.befores.length === 0 && this.afters.length === 0;
    }
    isShort() {
        if (!(this.befores.length === 1 && this.afters.length === 1)) return false;
        const before = this.befores.lines[0], after = this.afters[0];
        return Math.abs(before.length - after.length) <= 3;
    }
    reverse() {
        return new EditData(new Lines(this.befores.minLine, this.befores.minLine + this.afters.length - 1,
            this.afters), this.befores.lines, this.tag);
    }
    isNearWith(other: EditData) {
        return Math.abs(this.time.getTime() - other.time.getTime()) <= 1500;
    }
    canCombineWith(other?: EditData) {
        if (other === undefined) return false;
        if (this.tag !== undefined && this.tag === other.tag) return true;
        if (this.isEmpty() || other.isEmpty()) return true;
        if (this.isShort() && other.isShort() && this.isNearWith(other)) return true;
        return false;
    }
}

export class LineEditData extends EditData {
    constructor(lineCount: number, before: string, after: string, tag?: string) {
        super(Lines.single(lineCount, before), [after], tag);
    }
}

class TextFrame {
    // `edit`: What happens from this => next
    constructor(public last?: TextFrame, public next?: TextFrame, public edit?: EditData) { }
}

export class HistoryManager {
    frame = new TextFrame();

    clear() {
        this.frame = new TextFrame();
    }

    record(edit: EditData) {
        if (edit.isEmpty()) return;
        const newFrame = new TextFrame(this.frame);
        this.frame.next = newFrame;
        this.frame.edit = edit;
        this.frame = newFrame;
    }

    * undos() {
        let current = this.frame;
        let last = current.last;
        do {
            if (last === undefined) return;
            const edit = last.edit;
            if (edit === undefined) return;
            this.frame = last;
            yield edit.reverse();
            current = this.frame;
            last = current.last;
        } while (current.edit?.canCombineWith(last?.edit));
    }

    * redos() {
        let current, next;
        do {
            current = this.frame;
            next = current.next;
            if (next === undefined) return;
            const edit = current.edit;
            if (edit === undefined) return;
            this.frame = next;
            yield edit;
        } while (current.edit?.canCombineWith(next?.edit));
    }
}