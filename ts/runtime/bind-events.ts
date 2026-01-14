import type { Func } from '../utils/types.js';

export const bindFunction = (id: string, func: Func<[], void>) =>
    $_(id)?.addEventListener('click', func);

export const bindInput = (button: HTMLButtonElement | string,
    input: HTMLInputElement | string, func: Func<[content: string], void>) => {
    if (typeof button === 'string') button = $(button, 'button');
    if (typeof input === 'string') input = $(input, 'input');
    button.addEventListener('click', async () => await func(input.value));
    input.addEventListener('keyup', async event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await func(input.value);
    });
};