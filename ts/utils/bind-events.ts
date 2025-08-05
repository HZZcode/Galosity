import type { Func } from "./types.js";

export const bindFunction = (id: string, func: Func<[], void>) =>
    document.getElementById(id)?.addEventListener('click', func);

export const bindInput = (button: HTMLButtonElement, input: HTMLInputElement,
    func: (() => void) | (() => Promise<void>)) => {
    button.addEventListener('click', func);
    input.addEventListener('keyup', async event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            await func();
        }
    });
};