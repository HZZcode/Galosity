import type { Func } from "./types.js";

export const bindFunction = (id: string, func: Func<[], void>) =>
    document.getElementById(id)?.addEventListener('click', func);

export const bindInput = (button: HTMLButtonElement | string,
    input: HTMLInputElement | string, func: Func<[content: string], void>) => {
    if (typeof button === 'string') button = document.getElementById(button) as HTMLButtonElement;
    if (typeof input === 'string') input = document.getElementById(input) as HTMLInputElement;
    button.addEventListener('click', async () => await func(input.value));
    input.addEventListener('keyup', async event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await func(input.value);
    });
};