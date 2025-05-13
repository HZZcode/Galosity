const { ipcRenderer } = require('electron');
const parser = require('./parser');
const vars = require('./vars');

const character = document.getElementById('character');
const speech = document.getElementById('speech');
const part = document.getElementById('part');
const jump = document.getElementById('jump');
const lineInput = document.getElementById('line');
const currentLine = document.getElementById('current-line');

class ErrorManager {
    element;
    constructor() {
        this.element = document.getElementById('error');
    }
    error(msg) {
        this.element.innerText = msg;
    }
    clear() {
        this.element.innerText = '';
    }
}
const error = new ErrorManager();

class TextManager {
    outputText(name, text, color = 'black') {
        character.innerText = name;
        speech.innerHTML = text;
        speech.style.color = color;
        MathJax.typeset();
    }
    outputNote(note) {
        this.outputText('[Note]', note, 'gray');
    }
}

class InfoManager {
    setPart(name) {
        part.innerText = name;
    }
    setLine(line) {
        currentLine.innerText = `At line ${line}`;
    }
}

class ButtonData {
    text;
    func;
    constructor(text, func = null) {
        this.text = text;
        this.func = func;
    }
}
class ButtonsManager {
    parent = document.getElementById('buttons');
    clear() {
        this.parent.innerHTML = '';
    }
    drawButton(button, bottom) {
        let name = button.text;
        let element = document.createElement('div');
        element.innerText = name;
        element.className = 'container button';
        element.style.bottom = bottom;
        element.style.height = '7%';
        if (button.func !== null)
            element.addEventListener('click', button.func);
        this.parent.appendChild(element);
    }
    drawButtons(buttons) {
        let num = buttons.length;
        let midHeight = 50;
        let totalHeight = num * 10 - 3;
        let minHeight = midHeight + totalHeight / 2;
        for (let [i, button] of buttons.entries()) {
            let height = minHeight - i * 10;
            this.drawButton(button, height + '%');
        }
        //65% -> 35%, height = 7%, distance = 3%
    }
}

function interpolate(text, varsFrame) {
    text = text.trim();
    const regex = /(\$\{([^}]+)\})/g;
    let matches = [];
    let match;
    while ((match = regex.exec(text)) !== null)
        matches.push(match[1]);
    for (let sub of matches) {
        try {
            let value = varsFrame.evaluate(sub.substring(2, sub.length - 1));
            text = text.replaceAll(sub, value.toString());
        } catch (_) {}
    }
    return text;
}

class Frame {
    pos;
    varsFrame;
    constructor(pos, varsFrame) {
        this.pos = pos;
        this.varsFrame = varsFrame;
    }
}

class Manager {
    varsFrame;
    paragraph;
    currentPos = -1;
    history = []; //list of `Frame`s
    info = new InfoManager();
    texts = new TextManager();
    buttons = new ButtonsManager();
    constructor() { }
    set(lines) {
        this.varsFrame = new vars.GalVars();
        this.paragraph = new parser.Paragraph(lines);
    }
    isSelecting() {
        let data = this.paragraph.dataList[this.currentPos];
        return data !== undefined && data.type === 'select'
    }
    process(data) {
        if (this.currentPos >= this.paragraph.dataList.length) return true;
        if (data === undefined) return false;
        this.buttons.clear();
        switch (data.type) {
            case 'sentence': {
                if (data.character.trim() === '' && data.sentence.trim() === '')
                    return false;
                this.texts.outputText(interpolate(data.character, this.varsFrame),
                    interpolate(data.sentence, this.varsFrame));
                return true;
            }
            case 'note': {
                this.texts.outputNote(interpolate(data.note, this.varsFrame));
                return true;
            }
            case 'jump': {
                let pos = this.paragraph.findAnchorPos(data.anchor);
                if (pos === -1) throw `Anchor not found: ${data.anchor}`;
                this.currentPos = pos;
                return false;
            }
            case 'select': {
                let block = this.paragraph.findStartControlBlock(this.currentPos);
                let buttons = block.casesPosList.map(pos =>
                    new ButtonData(interpolate(this.paragraph.dataList[pos].text, this.varsFrame),
                        () => this.jump(new Frame(pos, this.varsFrame.copy()))))
                this.buttons.drawButtons(buttons);
                return true;
            }
            case 'break': {
                let casePos = this.paragraph.getCasePosAt(this.currentPos);
                let block = this.paragraph.findCaseControlBlock(casePos);
                if (block === undefined) throw `[Break] at line ${this.currentPos} is not in control block`;
                let endPos = block.endPos;
                this.currentPos = endPos;
                return false;
            }
            case 'var': {
                this.varsFrame.vars[data.name] = this.varsFrame.evaluate(data.expr);
                return false;
            }
            case 'enum': {
                let name = data.name.trim();
                let values = data.values.map(value => value.trim());
                this.varsFrame.defEnumType(new vars.GalEnumType(name, values));
                return false;
            }
        }
    }
    previous() {
        if (this.history.length <= 1) return;
        this.history.pop();
        let frame = this.history.pop();
        this.jump(frame);
    }
    next() {
        if (this.isSelecting()) return;
        if (this.currentPos >= this.paragraph.dataList.length) return;
        do {
            this.currentPos++;
            this.info.setLine(this.currentPos);
            this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        } while (!this.process(this.paragraph.dataList[this.currentPos]));
        this.history.push(new Frame(this.currentPos, this.varsFrame.copy()));
    }
    jump(frame) {
        if (frame.pos === undefined) return;
        this.currentPos = frame.pos;
        if (frame.varsFrame !== undefined) this.varsFrame = frame.varsFrame;
        this.info.setLine(this.currentPos);
        this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        while (!this.process(this.paragraph.dataList[this.currentPos])) this.currentPos++;
        this.history.push(new Frame(this.currentPos, this.varsFrame.copy()));
    }
}

let manager = new Manager();

let initPromise = new Promise((resolve, reject) => {
    try {
        ipcRenderer.on('send-data', (_, data) => {
            manager.set(data.content.split(/\r?\n/));
            manager.next();
            resolve();
        });
    } catch (error) {
        reject(error);
    }
});

let errorHandled = f => arg => {
    error.clear();
    try {
        return f(arg);
    } catch (err) {
        error.error(err);
    }
};

let handleError = true;
if (!handleError) errorHandled = f => f;

function isNum(value) {
    return Number.isFinite(Number(value)) && value != '';
}

async function main() {
    await initPromise;
    window.addEventListener('keydown', errorHandled(event => {
        if (event.target.tagName.toLowerCase() === 'input') return;
        let key = event.key;
        if (key === 'Backspace') manager.previous();
        else if (key === 'Enter') manager.next();
    }));
    function jumpLine() {
        let index = lineInput.value;
        if (isNum(index)) manager.jump(new Frame(index));
    }
    jump.addEventListener('click', errorHandled(_ => jumpLine()));
    lineInput.addEventListener('keyup', errorHandled(event => {
        if (event.key === 'Enter') jumpLine();
    }))
}

main();