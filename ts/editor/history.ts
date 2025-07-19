import { assert } from "../utils/assert.js";

const { v4: uuid } = require('uuid');

export const editTag = () => `Edit #${uuid()}`;

export class Lines {
    minLine;
    maxLine;
    lines;
    constructor(minLine: number, maxLine: number, lines: string[]) {
        assert(lines.length === maxLine - minLine + 1);
        this.minLine = minLine;
        this.maxLine = maxLine;
        this.lines = lines;
    }
}

export class EditData {
    befores;
    afters;
    time;
    tag;
    constructor(befores: Lines, afters: string[], tag?: string) {
        this.befores = befores;
        this.afters = afters;
        this.time = new Date();
        this.tag = tag;
    }
    static empty() {
        return new EditData(new Lines(0, -1, []), []);
    }
    isEmpty() {
        return this.befores.lines.length === 0 && this.afters.length === 0;
    }
    reverse() {
        return new EditData(new Lines(this.befores.minLine, this.befores.minLine + this.afters.length - 1,
            this.afters), this.befores.lines, this.tag);
    }
    canCombineWith(other?: EditData) {
        if (other === undefined) return false;
        if (this.tag !== undefined && other.tag !== undefined && this.tag === other.tag) return true;
        return false;
    }
}

export class LineEditData extends EditData {
    constructor(lineCount: number, before: string, after: string, tag?: string) {
        super(new Lines(lineCount, lineCount, [before]), [after], tag);
    }
}

class TextFrame {
    last;
    next;
    edit; // What happens from this -> next
    constructor(last?: TextFrame, next?: TextFrame, edit?: EditData) {
        this.last = last;
        this.next = next;
        this.edit = edit;
    }
}

export class HistoryManager {
    frame = new TextFrame();

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