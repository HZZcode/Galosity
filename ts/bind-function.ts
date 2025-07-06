export const bindFunction = (id: string, func: ((_: Event) => void) | (() => void)) =>
    document.getElementById(id)?.addEventListener('click', func);