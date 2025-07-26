const hljs = require('highlight.js');

export class TextManager {
    character;
    speech;
    texts;

    constructor(character: HTMLDivElement, speech: HTMLDivElement, texts: HTMLDivElement) {
        this.character = character;
        this.speech = speech;
        this.texts = texts;
    }
    
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
    part;
    currentLine;

    constructor(part: HTMLDivElement, currentLine: HTMLDivElement) {
        this.part = part;
        this.currentLine = currentLine;
    }

    setPart(name: string) {
        this.part.innerText = name;
    }
    setLine(line: number) {
        this.currentLine.innerText = `At line ${line}`;
    }
}