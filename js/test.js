const { ipcRenderer } = require('electron');
const parser = require('./parser');
const { splitWith, isLatex } = require('./split');
const vars = require('./vars');
const lodash = require('lodash');
const { Files } = require('./files');
const { logger } = require('./logger');
const { TimeoutManager } = require('./timeout');
const { KeybindManager } = require('./keybind');

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
        logger.error(e);
        error.error(e);
    }
};
let errorHandledAsWarning = f => arg => {
    error.clear();
    try {
        return f(arg);
    } catch (e) {
        logger.warn(e);
        error.warn('Warning: ' + e);
    }
};
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
export const error = new ErrorManager();

class TextManager {
    outputText(name, text, color = 'black') {
        character.innerHTML = name;
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
    enable;
    constructor(text, func = null, enable = true) {
        this.text = text;
        this.func = errorHandled(func);
        this.enable = enable;
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
        element.innerHTML = name;
        element.className = 'container button';
        if (!button.enable) element.className += ' disabled';
        element.style.bottom = bottom;
        element.style.height = '7%';
        if (button.func !== null && button.enable)
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
    drawInput(manager, func = null) {
        const element = document.createElement('input');
        element.className = 'container input';
        element.addEventListener('keyup', errorHandled(async event => {
            if (event.key === 'Enter') await manager.next();
        }));
        this.inputFunc = func;
        this.parent.appendChild(element);
    }
}

class Interpolations {
    funcs = {};
    register(tagChar, func) {
        if (tagChar in this.funcs) throw `Multiple registration of interpolation for ${tagChar}`;
        this.funcs[tagChar] = func;
    }
    getTagRegex() {
        return new RegExp(`[${Object.keys(this.funcs).join('')}](\\{([^{}]*?)\\})`, 'g');
    }
    process(text) {
        //Sure enough no one would use so many interpolations
        let currentIndex = 0;
        for (let i = 0; i < 128; i++) {
            const regex = this.getTagRegex();
            regex.lastIndex = currentIndex;
            const match = regex.exec(text);
            if (match === null) break;
            if (isLatex(text, match.index)) {
                currentIndex = match.index + match[0].length + 1;
                continue;
            }
            const func = this.funcs[match[0][0]];
            if (func !== undefined) text = text.replace(match[0], func(match[2]));
        }
        return text;
    }
}

function interpolate(text, varsFrame) {
    if (typeof text !== 'string') return text;
    const interpolation = new Interpolations();
    interpolation.register('$', sub => {
        let result = sub;
        varsFrame.warn = '';
        errorHandledAsWarning(() => result = varsFrame.evaluate(sub))();
        if (varsFrame.warn !== '') error.warn('Warning' + varsFrame.warn);
        return result;
    });
    interpolation.register('^', sub => `<sup>${sub}</sup>`);
    interpolation.register('_', sub => `<sub>${sub}</sub>`);
    interpolation.register('%', sub => {
        const [text, href] = splitWith(':')(sub);
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text === '' ? href : text}</a>`;
    });
    interpolation.register('~', sub => {
        const [rb, rt] = splitWith(':')(sub);
        return `<ruby><rb>${rb}</rb><rt>${rt}</rt><rp>(${rt})</rp></ruby>`;
    });
    return interpolation.process(text).replaceAll(/\\n/g, '<br>');
}

class CustomData {
    constructor(object) {
        if (object === undefined) return;
        for (const [key, value] of Object.entries(object))
            if (!(key in this)) this[key] = value;
    }

    toString() {
        return JSON.stringify(this);
    }

    static fromString(str) {
        return new CustomData(JSON.parse(str));
    }
}

export class Frame {
    pos;
    varsFrame;
    resources; // this is in string format
    customData;
    constructor(pos, varsFrame, resources, customData) {
        this.pos = pos;
        this.varsFrame = varsFrame;
        this.resources = resources;
        this.customData = customData;
    }

    withPos(pos) {
        this.pos = pos;
        return this;
    }

    toString() {
        return [this.pos, this.varsFrame, this.resources, this.customData]
            .map(data => data.toString()).join('\n');
    }

    static fromString(str) {
        const [pos, varsFrame, resources, customData] = str.split('\n');
        return new Frame(
            Number.parseInt(pos),
            vars.GalVars.fromString(varsFrame),
            resources,
            CustomData.fromString(customData)
        );
    }
}

class SaveInfo {
    time;
    sourceFile;
    note;
    constructor(sourceFile, note = '') {
        this.time = new Date();
        this.sourceFile = sourceFile;
        this.note = note.replaceAll('\n', '');
    }
    withTime(time) {
        this.time = time;
        return this;
    }
    toString() {
        return [
            this.time.getTime().toString(),
            this.sourceFile,
            this.note
        ].join('|').replaceAll('\n', '');
    }
    static fromString(str) {
        const [time, sourceFile, note] = splitWith('|')(str);
        return new SaveInfo(sourceFile, note).withTime(new Date(Number.parseInt(time)));
    }
}

class SaveLoadManager extends Files {
    manager;
    constructor(manager) {
        super();
        this.manager = manager;
    }
    getSourceFile() {
        return this.manager.resources.filename;
    }
    async getSaveFilePath(slot) {
        return await this.getSavePath() + `/save${slot}.gal`;
    }
    async isFilled(slot) {
        return await this.hasFile(await this.getSaveFilePath(slot));
    }
    async save(slot, note = '') {
        const str = new SaveInfo(note).toString() + '\n' + this.manager.getFrame().toString();
        await this.writeFile(await this.getSaveFilePath(slot), str);
    }
    async getInfo(slot) {
        if (!await this.isFilled(slot)) throw `No save data in slot ${slot}`;
        const str = await this.readFile(await this.getSaveFilePath(slot));
        return SaveInfo.fromString(splitWith('\n')(str)[0]);
    }
    async load(slot) {
        if (!await this.isFilled(slot)) throw `No save data in slot ${slot}`;
        try {
            const str = await this.readFile(await this.getSaveFilePath(slot));
            const file = (await this.getInfo()).sourceFile;
            if (file !== this.getSourceFile())
                await this.manager.set((await this.readFile(file)).split(/\r?\n/));
            await this.manager.jump(Frame.fromString(splitWith('\n')(str)[1]));
        }
        catch (e) {
            logger.error(e);
            error.error(e);
            throw `Cannot load from slot ${slot}: ${e}`;
        }
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
            if (left !== '') element.style.left = left;
            if (bottom !== '') element.style.bottom = bottom;
        };
        if (this.getElements().some(element => element.id === id)) {
            setPos(this.getElement(pos));
            return;
        }
        const element = document.createElement('div');
        element.className = 'image';
        element.id = id;
        setPos(element);
        this.parent.appendChild(element);
    }

    setElementBackground(element, background) {
        if (element === undefined || element.style === undefined) return;
        element.style.backgroundImage = background;
    }
    async setElementImage(element, file) {
        this.setElementBackground(element, file !== 'clear' ? `url("${await this.getSource(file)}")` : '');
    }
    async setImage(pos, file) {
        if (file.trim().startsWith('@')) {
            file = file.replace('@', '');
            let left = file.trim();
            let bottom = 0;
            if (file.includes(',')) {
                [left, bottom] = splitWith(',')(file);
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

    getPos(id) {
        return id.endsWith('-image') ? id.slice(0, -6) : '';
    }

    toString() {
        return this.getElements().map(element => [
            this.getPos(element.id),
            element.style.left,
            element.style.bottom,
            element.style.backgroundImage,
            element.style.transform
        ].join('|')).join(';');
    }
    static fromString(str) {
        const manager = new ResourceManager();
        manager.clear();
        if (!str.includes(';')) return manager;
        const elements = str.split(';');
        for (const element of elements) {
            const [pos, left, bottom, image, transform] = element.split('|');
            manager.defImagePos(pos, left, bottom);
            if (image !== '') manager.setElementBackground(manager.getElement(pos), image);
            manager.transformImage(pos, transform);
        }
        return manager;
    }
}

class Manager {
    varsFrame;
    paragraph;
    currentPos = -1;
    history = []; //list of `Frame`s
    callStack = []; //line count of [Call]s
    customData = new CustomData(); //might be used by [Eval] custom data
    info = new InfoManager();
    texts = new TextManager();
    buttons = new ButtonsManager();
    resources = new ResourceManager();
    saveLoad = new SaveLoadManager(this);
    timeout = new TimeoutManager();
    keybind = new KeybindManager();
    isMain;
    constructor(isMain = true) {
        this.isMain = isMain;
        if (!isMain) this.info.setLine = this.info.setPart
            = this.timeout.set = this.timeout.clear = () => 0;

        this.varsFrame = new vars.GalVars();
        this.varsFrame.initBuiltins();
    }
    unsupportedForImported() {
        if (this.isMain) return;
        throw `Operation not supported in imported files: `
        + `at line ${this.currentPos}, data type is '${this.currentData().type}'`;
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
        for (const data of this.paragraph.scanEnumsAt(this.currentPos)) {
            const name = data.name.trim();
            const values = data.values.map(value => value.trim());
            this.varsFrame.defEnumTypeIfUnexist(new vars.GalEnumType(name, values));
        }
    }
    async jumpFile(path) {
        path = await this.resources.getRelative(path);
        await ipcRenderer.invoke('readFile', path)
            .then(async content => await this.set(content.split(/\r?\n/)))
            .catch(e => {
                logger.error(e);
                error.error(e);
                throw `Cannot open file ${path}`;
            });
    }
    async process(data) {
        if (this.currentPos >= this.paragraph.dataList.length) return true;
        if (data === undefined) return false;
        if (this.buttons !== null) this.buttons.clear();
        this.timeout.clear();
        this.keybind.clear();
        this.setEnums();
        switch (data.type) {
            case 'sentence': {
                this.unsupportedForImported();
                if (data.character.trim() === '' && data.sentence.trim() === '')
                    return false;
                this.texts.outputText(interpolate(data.character, this.varsFrame),
                    interpolate(data.sentence, this.varsFrame));
                return true;
            }
            case 'note': {
                this.unsupportedForImported();
                this.texts.outputNote(interpolate(data.note, this.varsFrame));
                return true;
            }
            case 'jump': {
                const anchor = interpolate(data.anchor, this.varsFrame);
                if (data.crossFile) {
                    this.unsupportedForImported();
                    this.jumpFile(anchor);
                }
                else if (data.href) {
                    this.unsupportedForImported();
                    ipcRenderer.invoke('openExternal', anchor);
                }
                else {
                    const pos = this.paragraph.findAnchorPos(anchor);
                    if (pos === -1) throw `Anchor not found: ${anchor}`;
                    this.currentPos = pos - 1;
                }
                return false;
            }
            case 'select': {
                this.unsupportedForImported();
                const block = this.paragraph.findStartControlBlock(this.currentPos);
                const buttons = [];
                for (const pos of block.casesPosList) {
                    const data = this.paragraph.dataList[pos];
                    const show = this.varsFrame.evaluate(data.show).toBool();
                    const enable = this.varsFrame.evaluate(data.enable).toBool();
                    const text = interpolate(data.text, this.varsFrame);
                    const callback = async () => await this.jump(this.getFrame().withPos(pos));

                    if (show) buttons.push(new ButtonData(text, callback, enable));
                    if (data.timeout !== null)
                        this.timeout.set(callback, this.varsFrame.evaluate(data.timeout).toNum() * 1000);
                    if (data.key !== null)
                        this.keybind.bind(interpolate(data.key, this.varsFrame), callback);
                }
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
                        logger.error(e);
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
                this.unsupportedForImported();
                this.buttons.drawInput(this, expr => {
                    try {
                        const value = this.varsFrame.evaluate(expr);
                        this.varsFrame.setVar(data.valueVar, value);
                        this.varsFrame.setVar(data.errorVar, vars.BoolType.ofBool(false));
                    } catch (e) {
                        logger.error(e);
                        error.error(e);
                        this.varsFrame.setVar(data.errorVar, vars.BoolType.ofBool(true));
                    }
                });
                return true;
            }
            case 'image': {
                this.unsupportedForImported();
                await this.resources.check();
                const type = interpolate(data.imageType, this.varsFrame);
                const file = interpolate(data.imageFile, this.varsFrame);
                await this.resources.setImage(type, file);
                return false;
            }
            case 'transform': {
                this.unsupportedForImported();
                const interpolated = lodash.cloneDeep(data);
                for (const [key, value] of Object.entries(data))
                    interpolated[key] = interpolate(value, this.varsFrame);
                this.resources.transformImage(interpolated.imageType, interpolated);
                return false;
            }
            case 'delay': {
                this.unsupportedForImported();
                this.timeout.set(this.next.bind(this),
                    this.varsFrame.evaluate(data.seconds).toNum() * 1000, 2);
                return false;
            }
            case 'pause': return true;
            case 'eval': {
                const expr = interpolate(data.expr, this.varsFrame);
                errorHandledAsWarning(async () => await eval(expr))();
                return false;
            }
            case 'func': {
                this.currentPos = this.paragraph.findReturnPosAfter(this.currentPos);
                return false;
            }
            case 'call': {
                this.callStack.push(this.getFrame());
                const pos = this.paragraph.findFuncPos(data.name);
                const funcData = this.paragraph.dataList[pos];
                if (funcData.args.length !== data.args.length)
                    throw `Args doesn't match func ${funcData.name} at line ${this.currentPos}`;
                for (const [i, expr] of data.args.entries())
                    this.varsFrame.setVar(funcData.args[i], this.varsFrame.evaluate(expr));
                this.currentPos = pos;
                return false;
            }
            case 'return': {
                const value = data.value === '' ? new vars.GalNum(0) : this.varsFrame.evaluate(data.value);
                if (this.callStack.length === 0)
                    throw `Call stack is empty`;
                const frame = this.callStack.pop();
                this.currentPos = frame.pos;
                this.varsFrame = frame.varsFrame;
                const varName = this.paragraph.dataList[frame.pos].returnVar;
                if (varName !== null) this.varsFrame.setVar(varName, value);
                return false;
            }
            case 'import': {
                // Execute this file in an no-side-effect mode
                // And read the vars and enums with these names from the sub-manager
                // If they weren't defined in this environment yet, define them; otherwise nothing is done
                // It seems to be difficult to call funcs across files 
                // So I guess we would implement this a bit later
                const content = await this.resources.readFile(data.file);
                const subManager = new Manager(false);
                await subManager.set(content.split(/\r?\n/));
                for (; subManager.currentPos < subManager.paragraph.dataList.length;
                    subManager.currentPos++) {
                    await subManager.process(subManager.currentData());
                }
                for (const name of data.names) {
                    if (this.varsFrame.isDefinedSymbol(name)) continue;
                    else if (subManager.varsFrame.isDefinedVar(name))
                        this.varsFrame.setVar(name, subManager.varsFrame.vars[name]);
                    else if (subManager.varsFrame.isDefinedEnum(name))
                        this.varsFrame.defEnumType(subManager.varsFrame.getEnumType(name));
                    else throw `No such symbol in '${data.file}': '${name}'`;
                }
                return false;
            }
            default: return false;
        }
    }
    push(frame) {
        this.history.push(frame);
    }
    async previous() {
        await this.jump(this.history.pop(), false);
    }
    currentData() {
        return this.paragraph.dataList[this.currentPos];
    }
    async next() {
        if (this.isSelecting()) return;
        if (this.currentPos >= this.paragraph.dataList.length) return;
        this.push(this.getFrame());
        do {
            this.currentPos++;
            this.info.setLine(this.currentPos);
            this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        } while (!await this.process(this.currentData()));
    }
    async jump(frame, memorize = true) {
        if (frame === undefined || frame.pos === undefined) return;
        if (memorize) this.push(this.getFrame());
        this.currentPos = frame.pos;
        if (frame.varsFrame !== undefined) this.varsFrame = frame.varsFrame;
        if (frame.resources !== undefined)
            this.resources = ResourceManager.fromString(frame.resources);
        if (frame.customData !== undefined) this.customData = frame.customData;
        this.info.setLine(this.currentPos);
        this.info.setPart(this.paragraph.getPartAt(this.currentPos));
        while (!await this.process(this.paragraph.dataList[this.currentPos])) this.currentPos++;
    } // DO NOT call `jump` directly in `process`!!!
    async eval(line) {
        await this.process(parser.parseLine(line));
    }
    getFrame() {
        return new Frame(
            this.currentPos,
            this.varsFrame.copy(),
            this.resources.toString(),
            lodash.clone(this.customData)
        );
    }
    save() {
        // Here we need some GUI but I don't know how should it be yet
        // After that we simply get a slot and some optional notes
        // Then use `this.saveLoad.save(slot, note)`
    }
    load() {
        // Similar to `save()`. with `this.saveLoad.load(slot)`.
        // I just hate designing GUI.
    }
}

const manager = new Manager();

const initPromise = new Promise((resolve, reject) => {
    ipcRenderer.on('send-data', async (_, data) => {
        try {
            await manager.set(data.content.split(/\r?\n/));
            manager.resources.filename = data.filename;
            logger.isDebug = data.isDebug;
            resolve();
        } catch (e) {
            logger.error(e);
            error.error(e);
            reject(e);
        }
    });
});

function isNum(value) {
    return Number.isFinite(Number(value)) && value !== '';
}

async function main() {
    await initPromise;

    const bindFunction = (id, func) => document.getElementById(id).addEventListener('click', func);

    window.addEventListener('keydown', errorHandled(async event => {
        if (event.target.tagName.toLowerCase() === 'input') return;
        const key = event.key;
        if (key === 'Backspace') await manager.previous();
        else if (key === 'Enter') await manager.next();
        manager.keybind.check(event);
        // else if (event.ctrlKey && key.toLowerCase() === 's') await manager.save();
        // else if (event.ctrlKey && key.toLowerCase() === 'l') await manager.load();
    }));

    bindFunction('previous', manager.previous.bind(manager));
    bindFunction('next', manager.next.bind(manager));

    const bindInput = (button, input, func) => {
        button.addEventListener('click', errorHandled(func));
        input.addEventListener('keyup', errorHandled(async event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await func();
            }
        }));
    };

    bindInput(jump, lineInput, async () => {
        const index = lineInput.value;
        if (isNum(index)) await manager.jump(new Frame(index));
    });

    bindInput(evalButton, codeInput, async () => {
        const code = codeInput.value;
        await manager.eval(code);
    });
}
// TODO: Tip before jumping
// TODO: save & load
// TODO: search & replace
// TODO: import funcs

// eslint-disable-next-line floatingPromise/no-floating-promise
main();