const { ipcRenderer } = require('electron');

const character = document.getElementById('character');
const speech = document.getElementById('speech');

class Manager {
    lines = [];
    currentLine = -1;
    constructor() { }
    set(lines) {
        this.lines = lines;
        this.update();
    }
    update () {
        let line = this.lines[this.currentLine];
        if (line === undefined) return;
        let index = line.search(':');
        character.innerText = line.substring(0, index);
        speech.innerText = line.substring(index + 1);
    }
    process() {
        let line = this.lines[this.currentLine];
        if (line.trim().startsWith('[') || line === undefined)
            return true;
        this.update();
        return false;
    }
    previous() {
        do {
            if (this.currentLine <= 0) return;
            this.currentLine--;
        } while (this.process());
    }
    next() {
        do {
            if (this.currentLine >= this.lines.length - 1) return;
            this.currentLine++;
        } while (this.process());
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