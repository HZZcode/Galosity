import { HandleError } from '../runtime/errors.js';

export class ButtonData {
    constructor(public text: string, public func: () => Promise<void> | undefined, public enable = true) {
        this.func = HandleError(func);
    }
}
export class ButtonsManager {
    parent = $('buttons', 'div', 'engine');
    inputFunc?: (_: string) => void;
    clear() {
        const inputs = this.getInput();
        if (inputs.length !== 0) this.inputFunc?.(inputs[0].value);
        this.inputFunc = undefined;
        this.parent.innerHTML = '';
    }
    getInput() {
        return this.parent.getElementsByTagName('input');
    }
    drawButton(button: ButtonData, bottom: string) {
        const name = button.text;
        const element = document.createElement('div');
        element.innerHTML = name;
        element.className = 'container button';
        if (!button.enable) element.className += ' disabled';
        element.style.bottom = bottom;
        element.style.height = '7%';
        if (button.func !== undefined && button.enable)
            element.addEventListener('click', button.func);
        this.parent.appendChild(element);
        MathJax.typeset();
    }
    drawButtons(buttons: ButtonData[]) {
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
    drawInput(next: () => Promise<void>, func: (_: string) => void) {
        const element = document.createElement('input');
        element.className = 'container input';
        element.addEventListener('keyup', HandleError(async event => {
            if (event.key === 'Enter') await next();
        }));
        this.inputFunc = func;
        this.parent.appendChild(element);
    }
}
