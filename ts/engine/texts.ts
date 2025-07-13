export class TextManager {
    character;
    speech;

    constructor(character: HTMLDivElement, speech: HTMLDivElement) {
        this.character = character;
        this.speech = speech;
    }
    
    outputText(name: string, text: string, color = 'var(--color-4)') {
        this.character.innerHTML = name;
        this.speech.innerHTML = text;
        this.speech.style.color = color;
        MathJax.typeset();
    }
    outputNote(note: string) {
        this.outputText('[Note]', note, 'var(--color-3)');
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