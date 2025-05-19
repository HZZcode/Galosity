const { ipcRenderer } = require('electron');
const parser = require('./parser');
const vars = require('./vars');
const lodash = require('lodash');

const character = document.getElementById('character');
const speech = document.getElementById('speech');
const part = document.getElementById('part');
const jump = document.getElementById('jump');
const lineInput = document.getElementById('line');
const currentLine = document.getElementById('current-line');

const handleError = true;

let errorHandled = f => arg => {
    error.clear();
    try {
        return f(arg);
    } catch (err) {
        error.error(err);
    }
};
let errorHandledAsWarning = f => arg => {
    error.clear();
    try {
        return f(arg);
    } catch (err) {
        error.warn('Warning: ' + err);
    }
}
if (!handleError) errorHandled = errorHandledAsWarning = f => f;

class ErrorManager {
    errorElement;
    warnElement;
    constructor() {
        this.errorElement = document.getElementById('error');
        this.warnElement = document.getElementById('warning');
    }
    error(msg) {
        this.errorElement.innerText = msg;
    }
    warn(msg) {
        this.warnElement.innerText = msg;
    }
    clear() {
        this.errorElement.innerText = this.warnElement.innerText = '';
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
    inputFunc = null;
    clear() {
        let inputs = this.getInput();
        if (inputs.length !== 0 && this.inputFunc !== null)
            this.inputFunc(inputs[0].value);
        this.inputFunc = null;
        this.parent.innerHTML = '';
    }
    getInput() {
        return this.parent.getElementsByTagName('input');
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
    drawInput(func = null) {
        let element = document.createElement('input');
        element.className = 'container input';
        element.addEventListener('keyup', errorHandled(async event => {
            if (event.key === 'Enter') await manager.next();
        }));
        this.inputFunc = func;
        this.parent.appendChild(element);
    }
}

function interpolate(text, varsFrame) {
    if (typeof text !== 'string') return text;
    text = text.trim();
    const regex = /(\$\{([^}]+)\})/g;
    let matches = [];
    let match;
    while ((match = regex.exec(text)) !== null)
        matches.push(match[1]);
    for (let sub of matches) {
        varsFrame.warn = '';
        errorHandledAsWarning(() => {
            let value = varsFrame.evaluate(sub.substring(2, sub.length - 1));
            text = text.replace(sub, value.toString());
        })();
        if (varsFrame.warn !== '') error.warn('Warning' + varsFrame.warn);
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

class FileManager {
    filename;
    constructor(filename = null) {
        this.filename = filename;
    }
    async check() {
        if (this.filename === null)
            this.filename = await ipcRenderer.invoke('directory') + '/?';
    }
    getPath() {
        return this.filename.split('/').slice(0, -1).join('/');
    }
    getSource(file) {
        return this.getPath() + '/src/' + file;
    }

    getBody() {
        return document.body;
    }
    getElement(pos) {
        return document.getElementById(`${pos}-image`);
    }

    setElementImage(element, file) {
        element.style.backgroundImage = file !== 'clear' ? `url("${this.getSource(file)}")` : '';
    }
    setBackground(file) {
        this.setElementImage(this.getBody(), file);
    }
    setImage(pos, file) {
        this.setElementImage(this.getElement(pos), file);
    }

    transformElement(element, transform) {
        element.style.transform = transform.toString();
    }
    transformBackground(transform) {
        this.transformElement(this.getBody(), transform);
    }
    transformImage(pos, transform) {
        this.transformElement(this.getElement(pos), transform);
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
    files = new FileManager();
    set(lines) {
        this.varsFrame = new vars.GalVars();
        this.varsFrame.initBuiltins();
        this.paragraph = new parser.Paragraph(lines);
    }
    isSelecting() {
        let data = this.paragraph.dataList[this.currentPos];
        return data !== undefined && data.type === 'select'
    }
    setEnums() {
        this.varsFrame.clearEnumTypes();
        for (let data of this.paragraph.scanEnumsAt(this.currentPos)) {
            let name = data.name.trim();
            let values = data.values.map(value => value.trim());
            this.varsFrame.defEnumType(new vars.GalEnumType(name, values));
        }
    }
    async process(data) {
        if (this.currentPos >= this.paragraph.dataList.length) return true;
        if (data === undefined) return false;
        this.buttons.clear();
        this.setEnums();
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
                this.currentPos = pos - 1;
                return false;
            }
            case 'select': {
                let block = this.paragraph.findStartControlBlock(this.currentPos);
                let buttons = block.casesPosList.map(pos =>
                    new ButtonData(interpolate(this.paragraph.dataList[pos].text, this.varsFrame),
                        async () => await this.jump(new Frame(pos, this.varsFrame.copy()))))
                this.buttons.drawButtons(buttons);
                return true;
            }
            case 'case': {
                if (this.paragraph.getCaseType(this.currentPos) === 'switch') {
                    let block = this.paragraph.findCaseControlBlock(this.currentPos);
                    let switchData = this.paragraph.dataList[block.startPos];
                    try {
                        let value = this.varsFrame.evaluate(switchData.expr);
                        let matchValue = this.varsFrame.evaluate(data.text);
                        let next = block.next(this.currentPos);
                        if (next === undefined) throw `Case error at line ${this.currentPos}`;
                        if (!this.varsFrame.equal(value, matchValue))
                            this.currentPos = next;
                    } catch (e) {
                        error.error(e);
                    }
                    return false;
                }
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
                this.varsFrame.warn = '';
                errorHandled(() => this.varsFrame.setVar(data.name, this.varsFrame.evaluate(data.expr)))();
                if (this.varsFrame.warn !== '') error.warn('Warning: ' + this.varsFrame.warn);
                return false;
            }
            case 'input': {
                this.buttons.drawInput(expr => {
                    try {
                        let value = this.varsFrame.evaluate(expr);
                        this.varsFrame.setVar(data.valueVar, value);
                        this.varsFrame.setVar(data.errorVar, vars.BoolType.ofBool(false));
                    } catch (e) {
                        error.error(e);
                        this.varsFrame.setVar(data.errorVar, vars.BoolType.ofBool(true));
                    }
                });
                return true;
            }
            case 'image': {
                await this.files.check();
                let file = interpolate(data.imageFile, this.varsFrame);
                switch (data.imageType) {
                    case 'background':
                        this.files.setBackground(file);
                        break;
                    case 'left': case 'center': case 'right':
                        this.files.setImage(data.imageType, file);
                        break;
                }
                return false;
            }
            case 'transform': {
                let interpolated = lodash.cloneDeep(data);
                for (let key in interpolated)
                    interpolated[key] = interpolate(data[key], this.varsFrame);
                switch (interpolated.imageType) {
                    case 'left': case 'center': case 'right':
                        this.files.transformImage(interpolated.imageType, interpolated);
                        break;
                }
                return false;
            }
            case 'delay': {
                setTimeout(() => this.next(), data.seconds * 1000);
                return false;
            }
            case 'pause': return true;
            default: return false;
        }
    }
    async previous() {
        if (this.history.length <= 1) return;
        this.history.pop();
        let frame = this.history.pop();
        await this.jump(frame);
    }
    async next() {
        if (this.isSelecting()) return;
        if (this.currentPos >= this.paragraph.dataList.length) return;
        do {
            this.currentPos++;
            this.info.setLine(this.currentPos);
            this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        } while (!await this.process(this.paragraph.dataList[this.currentPos]));
        this.history.push(new Frame(this.currentPos, this.varsFrame.copy()));
    }
    async jump(frame) {
        if (frame.pos === undefined) return;
        this.currentPos = frame.pos;
        if (frame.varsFrame !== undefined) this.varsFrame = frame.varsFrame;
        this.info.setLine(this.currentPos);
        this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        do this.currentPos++; while (!await this.process(this.paragraph.dataList[this.currentPos]));
        this.history.push(new Frame(this.currentPos, this.varsFrame.copy()));
    } // DO NOT call `jump` directly in `process`!!!
}

let manager = new Manager();

let initPromise = new Promise((resolve, reject) => {
    try {
        ipcRenderer.on('send-data', async (_, data) => {
            manager.set(data.content.split(/\r?\n/));
            manager.files.filename = data.filename;
            await manager.next();
            resolve();
        });
    } catch (error) {
        reject(error);
    }
});

function isNum(value) {
    return Number.isFinite(Number(value)) && value !== '';
}

async function main() {
    await initPromise;
    window.addEventListener('keydown', errorHandled(async event => {
        if (event.target.tagName.toLowerCase() === 'input') return;
        let key = event.key;
        if (key === 'Backspace') manager.previous();
        else if (key === 'Enter') await manager.next();
    }));
    async function jumpLine() {
        let index = lineInput.value;
        if (isNum(index)) await manager.jump(new Frame(index));
    }
    jump.addEventListener('click', errorHandled(async _ => await jumpLine()));
    lineInput.addEventListener('keyup', errorHandled(async event => {
        if (event.key === 'Enter') await jumpLine();
    }));
} 

main();