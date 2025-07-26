import { EditData, LineEditData, HistoryManager } from "./history.js";

export const textHistory = new HistoryManager();

export class TextAreaManager {
    textarea;
    content;
    start;
    end;
    lines;
    constructor(textarea: HTMLTextAreaElement) {
        this.textarea = textarea;
        this.content = textarea.value;
        this.start = textarea.selectionStart;
        this.end = textarea.selectionEnd;
        this.lines = this.content.splitLine();
    }
    syncPos() {
        this.jumpTo(this.currentLineCount());
    }
    sync() {
        this.textarea.value = this.lines.join('\n');
        this.syncPos();
    }
    currentLineCount() {
        return this.content.substring(0, this.start).splitLine().length - 1;
    }
    currentEndLineCount() {
        return this.content.substring(0, this.end).splitLine().length - 1;
    }
    currentColumn() {
        return this.currentLineFrontContent().length;
    }
    currentLine() {
        return this.lines[this.currentLineCount()];
    }
    currentLineFrontContent() {
        return this.content.substring(0, this.start).splitLine()[this.currentLineCount()];
    }
    currentLineBackContent() {
        return this.content.substring(this.start).splitLine()[0];
    }
    beforeLines() {
        return this.lines.slice(0, this.currentLineCount());
    }
    beforeLinesLength() {
        return this.beforeLines().join('\n').length + 1;
    }
    insert(text: string, length = 0, pos?: number, tag?: string) {
        const line = this.currentLine();
        if (pos === undefined) pos = this.currentColumn();
        const modified = line.substring(0, pos - length) + text + line.substring(pos);
        const start = this.start;
        this.edit(this.currentLineCount(), modified, true, tag);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length - length;
    }
    complete(text: string, part: string) {
        this.insert(text, part.length);
    }
    move(step: number) {
        this.textarea.selectionStart += step;
        this.textarea.selectionEnd += step;
    }
    edit(line: number, modified: string, record: boolean = true, tag?: string) {
        if (record) textHistory.record(new LineEditData(line, this.lines[line], modified, tag));
        this.lines[line] = modified;
        this.sync();
    }
    editData(edit?: EditData, record: boolean = false) {
        if (edit === undefined) return;
        if (record) textHistory.record(edit);
        this.lines = [
            ...this.lines.slice(0, edit.befores.minLine),
            ...edit.afters,
            ...this.lines.slice(edit.befores.maxLine + 1)
        ];
        this.sync();
    }
    undo() {
        textHistory.undos().forEach(edit => this.editData(edit));
    }
    redo() {
        textHistory.redos().forEach(edit => this.editData(edit));
    }
    jumpTo(line: number): boolean {
        if (line < 0 || line >= this.lines.length) return false;
        this.textarea.focus(); // does so fixes bugs.
        // don't know why but just works. it doesn't make things worse though.
        const pos = [this.textarea.selectionStart, this.textarea.selectionEnd];
        const endOfLine = this.lines.slice(0, line + 1).join('\n').length;
        this.textarea.selectionStart = this.textarea.selectionEnd = endOfLine;
        const tempElement = document.createElement('div');
        tempElement.style.position = 'absolute';
        tempElement.style.visibility = 'hidden';
        tempElement.style.whiteSpace = 'pre-wrap';
        tempElement.style.fontFamily = this.textarea.style.fontFamily;
        tempElement.style.fontSize = this.textarea.style.fontSize;
        tempElement.innerHTML = this.textarea.value.substring(0, endOfLine);
        document.body.appendChild(tempElement);
        const lineHeight = tempElement.offsetHeight / (line + 1);
        const scrollTop = line * lineHeight;
        document.body.removeChild(tempElement);
        this.textarea.scrollTop = scrollTop;
        this.textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        [this.textarea.selectionStart, this.textarea.selectionEnd] = pos;
        return true;
    }
}