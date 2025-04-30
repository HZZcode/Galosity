const { ipcRenderer } = require('electron');
const parser = require('./parser')

const character = document.getElementById('character');
const speech = document.getElementById('speech');
const part = document.getElementById('part');
const jump = document.getElementById('jump');
const lineInput = document.getElementById('line');
const currentLine = document.getElementById('current-line');

function findAnchor(lines, name) {
    for (let [index, line] of lines.entries())
        if (line.trim().startsWith('[Anchor]')
            && line.replace('[Anchor]', '').trim() == name)
            return index;
    return -1;
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

class Manager {
    history = [];
    lines = [];
    currentLine = -1;
    buttons = new ButtonsManager();
    constructor() { }
    set(lines) {
        this.lines = lines;
        this.update();
    }
    update() {
        let line = this.lines[this.currentLine];
        if (line === undefined) return;
        if (line.trim().startsWith('[Note]')) {
            this.buttons.clear();
            character.innerText = '[Note]';
            character.style.color = 'gray';
            speech.innerText = line.replace('[Note]', '').trim();
            speech.style.color = 'gray';
        }
        else if (!line.trim().startsWith('[Select]'))  {
            this.buttons.clear();
            let index = line.search(':');
            character.innerText = line.substring(0, index).trim();
            character.style.color = 'black';
            speech.innerText = line.substring(index + 1).trim();
            speech.style.color = 'black';
        }
        currentLine.innerText = `At line ${this.currentLine}`;
        part.innerText = parser.getPartAt(this.lines, this.currentLine);
    }
    process() {
        let line = this.lines[this.currentLine];
        if (line.trim().startsWith('[Jump]')) {
            let name = line.replace('[Jump]', '').trim();
            let index = findAnchor(this.lines, name);
            if (index !== -1) this.currentLine = index;
        }
        if (line.trim().startsWith('[Select]')) {
            try {
                let blocks = parser.scanControlBlocks(this.lines);
                let found = blocks.filter(block => block.startPos == this.currentLine);
                if (found.length === 0)
                    throw `Cannot find control block starting at line ${this.currentLine}`;
                let block = found[0];
                let choices = block.casesPosList;
                let buttons = choices.map(index => {
                    let line = this.lines[index];
                    let trimComma = str => (str.substring(0, str.lastIndexOf(':'))
                        + str.substring(str.lastIndexOf(':') + 1));
                    let text = trimComma(line.replace('[Case]', '')).trim();
                    return new ButtonData(text, _ => this.jump(index));
                });
                this.buttons.drawButtons(buttons);
            } catch (err) {
                document.getElementById('error').innerText = err;
            }
        }
        if (line.trim().startsWith('[Break]')) {
            try {
                let blocks = parser.scanControlBlocks(this.lines);
                let previousCase = parser.getCaseLine(this.lines, this.currentLine);
                let found = blocks.filter(block => block.casesPosList.some(pos => pos == previousCase));
                if (found.length === 0)
                    throw `Case block at line ${previousCase} not in control block`;
                let block = found[0];
                this.jump(block.endPos);
            } catch (err) {
                document.getElementById('error').innerText = err;
            }
        }
        if ((line.trim().startsWith('[') && !line.trim().startsWith('[Note]')
            && !line.trim().startsWith('[Select]'))
            || line === undefined || line.trim() === '' || line.trim().startsWith('//'))
            return true;
        this.update();
        return false;
    }
    previous() {
        if (this.history.length !== 0) {
            this.currentLine = this.history.pop();
            this.update();
        }
    }
    next() {
        let current = this.currentLine;
        do {
            if (this.currentLine >= this.lines.length - 1) return;
            let line = this.lines[this.currentLine];
            if (line !== undefined && line.trim().startsWith('[Select]')) return;
            this.currentLine++;
        } while (this.process());
        this.history.push(current);
    }
    jump(index) {
        if (index < 0 || index >= this.lines.length) return;
        let current = this.currentLine;
        this.currentLine = index;
        while (this.process()) {
            if (this.currentLine >= this.lines.length - 1) return;
            this.currentLine++;
        }
        this.history.push(current);
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

function isNum(value) {
    return Number.isFinite(Number(value)) && value != '';
}

async function main() {
    await initPromise;
    window.addEventListener('keydown', event => {
        if (event.target.tagName.toLowerCase() === 'input') return;
        let key = event.key;
        if (key === 'Backspace') manager.previous();
        else if (key === 'Enter') manager.next();
    });
    function jumpLine() {
        let index = lineInput.value;
        if (isNum(index)) manager.jump(index);
    }
    jump.addEventListener('click', _ => jumpLine);
    lineInput.addEventListener('keyup', event => {
        if (event.key === 'Enter') jumpLine();
    })
}

main();