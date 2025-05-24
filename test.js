const { ipcRenderer } = require('electron');
const parser = require('./parser');
const vars = require('./vars');
const lodash = require('lodash');
const { Files } = require('./files');

const character = document.getElementById('character');
const speech = document.getElementById('speech');
const part = document.getElementById('part');
const jump = document.getElementById('jump');
const lineInput = document.getElementById('line');
const currentLine = document.getElementById('current-line');
const evalButton = document.getElementById('eval');
const codeInput = document.getElementById('code');

const handleError = true;

let errorHandled = f => arg => {
    error.clear();
    try {
        return f(arg);
    } catch (e) {
        console.error(e);
        error.error(e);
    }
};
let errorHandledAsWarning = f => arg => {
    error.clear();
    try {
        return f(arg);
    } catch (e) {
        console.warn(e);
        error.warn('Warning: ' + e);
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
        // eslint-disable-next-line no-undef
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
        const inputs = this.getInput();
        if (inputs.length !== 0 && this.inputFunc !== null)
            this.inputFunc(inputs[0].value);
        this.inputFunc = null;
        this.parent.innerHTML = '';
    }
    getInput() {
        return this.parent.getElementsByTagName('input');
    }
    drawButton(button, bottom) {
        const name = button.text;
        const element = document.createElement('div');
        element.innerText = name;
        element.className = 'container button';
        element.style.bottom = bottom;
        element.style.height = '7%';
        if (button.func !== null)
            element.addEventListener('click', button.func);
        this.parent.appendChild(element);
        // eslint-disable-next-line no-undef
        MathJax.typeset();
    }
    drawButtons(buttons) {
        const num = buttons.length;
        const midHeight = 50;
        const totalHeight = num * 10 - 3;
        const minHeight = midHeight + totalHeight / 2;
        for (const [i, button] of buttons.entries()) {
            const height = minHeight - i * 10;
            this.drawButton(button, height + '%');
        }
        //65% -> 35%, height = 7%, distance = 3%
    }
    drawInput(func = null) {
        const element = document.createElement('input');
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
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null)
        matches.push(match[1]);
    for (const sub of matches) {
        varsFrame.warn = '';
        errorHandledAsWarning(() => {
            const value = varsFrame.evaluate(sub.substring(2, sub.length - 1));
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

class ResourceManager extends Files {
    parent = document.getElementById('images');
    constructor(filename = null) {
        super(filename);
    }
    getImageElements() {
        return [...this.parent.querySelectorAll('.image')];
    }
    getElements() {
        return [...this.getImageElements(), this.getElement('background')];
    }
    getElement(pos) {
        return document.getElementById(`${pos}-image`);
    }

    async clear() {
        this.getImageElements().forEach(async element => await this.setElementImage(element, 'clear'));
        await this.setImage('background', 'clear');
    }

    defImagePos(pos, left, bottom) {
        const id = `${pos}-image`;
        const setPos = element => {
            element.style.left = left;
            element.style.bottom = bottom;
        };
        if (this.getElements().some(element => element.id === id))
            setPos(this.getElement(pos));
        const element = document.createElement('div');
        element.className = 'image';
        element.id = id;
        setPos(element);
        this.parent.appendChild(element);
    }

    async setElementImage(element, file) {
        if (element === undefined || element.style === undefined) return;
        element.style.backgroundImage = file !== 'clear' ? `url("${await this.getSource(file)}")` : '';
    }
    async setImage(pos, file) {
        if (file.trim().startsWith('@')) {
            file = file.replace('@', '');
            let left = file.trim();
            let bottom = 0;
            if (file.includes(',')) {
                [left, bottom] = parser.splitWith(',')(file);
            }
            this.defImagePos(pos, left, bottom);
        }
        else await this.setElementImage(this.getElement(pos), file);
    }

    transformElement(element, transform) {
        if (element === undefined || element.style === undefined) return;
        element.style.transform = transform.toString();
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
    resources = new ResourceManager();
    init() {
        this.varsFrame = new vars.GalVars();
        this.varsFrame.initBuiltins();
    }
    async set(lines) {
        this.paragraph = new parser.Paragraph(lines);
        this.currentPos = -1;
        await this.resources.clear();
        await this.next();
    }
    isSelecting() {
        const data = this.paragraph.dataList[this.currentPos];
        return data !== undefined && data.type === 'select';
    }
    setEnums() {
        this.varsFrame.clearEnumTypes();
        for (const data of this.paragraph.scanEnumsAt(this.currentPos)) {
            const name = data.name.trim();
            const values = data.values.map(value => value.trim());
            this.varsFrame.defEnumType(new vars.GalEnumType(name, values));
        }
    }
    async jumpFile(path) {
        path = await this.resources.getRelative(path);
        await ipcRenderer.invoke('readFile', path)
            .then(async content => await this.set(content.split(/\r?\n/)))
            .catch(e => {
                console.error(e);
                throw `Cannot open file ${path}`;
            });
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
                if (data.crossFile) this.jumpFile(data.anchor);
                else {
                    const pos = this.paragraph.findAnchorPos(data.anchor);
                    if (pos === -1) throw `Anchor not found: ${data.anchor}`;
                    this.currentPos = pos - 1;
                }
                return false;
            }
            case 'select': {
                const block = this.paragraph.findStartControlBlock(this.currentPos);
                const buttons = block.casesPosList.map(pos =>
                    new ButtonData(interpolate(this.paragraph.dataList[pos].text, this.varsFrame),
                        async () => await this.jump(new Frame(pos, this.varsFrame.copy()))))
                this.buttons.drawButtons(buttons);
                return true;
            }
            case 'case': {
                if (this.paragraph.getCaseType(this.currentPos) === 'switch') {
                    const block = this.paragraph.findCaseControlBlock(this.currentPos);
                    const switchData = this.paragraph.dataList[block.startPos];
                    try {
                        const value = this.varsFrame.evaluate(switchData.expr);
                        const matchValue = this.varsFrame.evaluate(data.text);
                        const next = block.next(this.currentPos);
                        if (next === undefined) throw `Case error at line ${this.currentPos}`;
                        if (!this.varsFrame.equal(value, matchValue))
                            this.currentPos = next;
                    } catch (e) {
                        console.error(e);
                        error.error(e);
                    }
                }
                return false;
            }
            case 'break': {
                const casePos = this.paragraph.getCasePosAt(this.currentPos);
                const block = this.paragraph.findCaseControlBlock(casePos);
                if (block === undefined) throw `[Break] at line ${this.currentPos} is not in control block`;
                const endPos = block.endPos;
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
                        const value = this.varsFrame.evaluate(expr);
                        this.varsFrame.setVar(data.valueVar, value);
                        this.varsFrame.setVar(data.errorVar, vars.BoolType.ofBool(false));
                    } catch (e) {
                        console.error(e);
                        error.error(e);
                        this.varsFrame.setVar(data.errorVar, vars.BoolType.ofBool(true));
                    }
                });
                return true;
            }
            case 'image': {
                await this.resources.check();
                const type = interpolate(data.imageType, this.varsFrame);
                const file = interpolate(data.imageFile, this.varsFrame);
                await this.resources.setImage(type, file);
                return false;
            }
            case 'transform': {
                const interpolated = lodash.cloneDeep(data);
                for (const key in interpolated)
                    interpolated[key] = interpolate(data[key], this.varsFrame);
                this.resources.transformImage(interpolated.imageType, interpolated);
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
        const frame = this.history.pop();
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
    async eval(line) {
        await this.process(parser.parseLine(line));
    }
}

const manager = new Manager();

const initPromise = new Promise((resolve, reject) => {
    try {
        ipcRenderer.on('send-data', async (_, data) => {
            manager.init();
            await manager.set(data.content.split(/\r?\n/));
            manager.resources.filename = data.filename;
            resolve();
        });
    } catch (e) {
        console.error(e);
        reject(e);
    }
});

function isNum(value) {
    return Number.isFinite(Number(value)) && value !== '';
}

async function main() {
    await initPromise;
    window.addEventListener('keydown', errorHandled(async event => {
        if (event.target.tagName.toLowerCase() === 'input') return;
        const key = event.key;
        if (key === 'Backspace') manager.previous();
        else if (key === 'Enter') await manager.next();
    }));

    const bindInput = (button, input, func) => {
        button.addEventListener('click', errorHandled(func));
        input.addEventListener('keyup', errorHandled(async event => {
            if (event.key === 'Enter') await func();
        }));
    }

    bindInput(jump, lineInput, async () => {
        const index = lineInput.value;
        if (isNum(index)) await manager.jump(new Frame(index));
    });

    bindInput(evalButton, codeInput, async () => {
        const code = codeInput.value;
        await manager.eval(code);
    });
}

// eslint-disable-next-line floatingPromise/no-floating-promise
main();