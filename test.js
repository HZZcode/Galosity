const { ipcRenderer } = require('electron');
const parser = require('./parser')

const character = document.getElementById('character');
const speech = document.getElementById('speech');
const part = document.getElementById('part');

function findAnchor(lines, name) {
    for (let [index, line] of lines.entries())
        if (line.trim().startsWith('[Anchor]')
            && line.replace('[Anchor]', '').trim() == name)
            return index;
    return -1;
}

class Manager {
    history = [];
    lines = [];
    currentLine = -1;
    constructor() { }
    set(lines) {
        this.lines = lines;
        this.update();
    }
    update() {
        let line = this.lines[this.currentLine];
        if (line === undefined) return;
        if (line.trim().startsWith('[Note]')) {
            character.innerText = '[Note]';
            character.style.color = 'gray';
            speech.innerText = line.replace('[Note]', '').trim();
            speech.style.color = 'gray';
        }
        else {
            let index = line.search(':');
            character.innerText = line.substring(0, index).trim();
            character.style.color = 'black';
            speech.innerText = line.substring(index + 1).trim();
            speech.style.color = 'black';
        }
        part.innerText = parser.getPartAt(this.lines, this.currentLine);
    }
    process() {
        let line = this.lines[this.currentLine];
        if (line.trim().startsWith('[Jump]')) {
            let name = line.replace('[Jump]', '').trim();
            let index = findAnchor(this.lines, name);
            if (index !== -1) this.currentLine = index;
        }
        if ((line.trim().startsWith('[') && !line.trim().startsWith('[Note]'))
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
            this.currentLine++;
        } while (this.process());
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

async function main() {
    await initPromise;
    window.addEventListener('keydown', event => {
        let key = event.key;
        if (key === 'Backspace') manager.previous();
        else if (key === 'Enter') manager.next();
        else console.log(event);
    });
}

main();