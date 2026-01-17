import type { Environment } from '../types.js';
import { assert } from '../utils/assert.js';
import { Runtime } from './runtime.js';

function getNullableElement<Tag extends keyof HTMLElementTagNameMap>
    (id: string, tag?: Tag, environment?: Environment) {
    const element = document.getElementById(id);
    if (element === null) {
        assert(Runtime.environment !== environment, `Element ${id} cannot be null in ${environment}`);
        return undefined;
    }
    assert(element.tagName.toLowerCase() === tag || tag === undefined, `Element ${id} has a wrong type`);
    return element as HTMLElementTagNameMap[Tag];
}
function getElement<Tag extends keyof HTMLElementTagNameMap>
    (id: string, tag?: Tag, environment?: Environment) {
    return getNullableElement(id, tag, environment)!;
}

window.$_ = getNullableElement;
window.$ = getElement;

declare global {
    const $_: typeof getNullableElement;
    const $: typeof getElement;
    interface Window {
        $_: typeof getNullableElement;
        $: typeof getElement;
    }
}