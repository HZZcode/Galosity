const hljs = require('highlight.js');

export class TextManager {
    constructor(public character: HTMLDivElement,
        public speech: HTMLDivElement,
        public texts: HTMLDivElement) { }

    outputSpeech(name: string, text: string, color = 'var(--color-4)') {
        this.character.innerHTML = name;
        this.speech.innerHTML = text;
        this.speech.style.color = color;
        MathJax.typeset();
    }
    outputNote(note: string) {
        this.outputSpeech('[Note]', note, 'var(--color-3)');
    }
    outputTexts(texts: string) {
        this.texts.innerHTML = texts;
        MathJax.typeset();
    }
    outputCode(language: string, code: string) {
        this.outputTexts(hljs.highlight(code, { language }).value);
    }
}

export class InfoManager {
    constructor(public part: HTMLDivElement, public currentLine: HTMLDivElement) { }

    setPart(name: string) {
        this.part.innerText = name;
    }
    setLine(line: number) {
        this.currentLine.innerText = `At line ${line}`;
    }
}