export class TextManager {
    readonly character = document.getElementById('character') as HTMLDivElement;
    readonly speech = document.getElementById('speech') as HTMLDivElement;
    readonly texts = document.getElementById('texts') as HTMLDivElement;

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
        this.outputTexts(highlight.highlight(code, { language }).value);
    }
    clear() {
        this.outputTexts('');
    }
}

export class InfoManager {
    readonly part = document.getElementById('part') as HTMLDivElement;
    readonly currentLine = document.getElementById('current-line') as HTMLDivElement;

    setPart(name: string) {
        this.part.innerText = name;
    }
    setLine(line: number) {
        this.currentLine.innerText = `At line ${line}`;
    }
}