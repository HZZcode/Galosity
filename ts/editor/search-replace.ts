import { sum } from "../utils/array.js";
import type { Searchable } from "../utils/string.js";
import { getManager, textarea } from "./elements.js";
import { recordInput } from "./input-record.js";

export class Searcher {
    private constructor() { }

    static search(sub: Searchable, start: number = textarea.selectionEnd) {
        const pos = textarea.value.searchPos(sub, start);
        if (pos === undefined) return;
        textarea.setSelectionRange(pos[0], pos[1], 'forward');
        getManager().syncPos();
        return pos;
    }

    static replace(sub: Searchable, str: string, start: number = textarea.selectionEnd) {
        const pos = this.search(sub, start);
        if (pos === undefined) return;
        textarea.value = textarea.value.replacePos(pos, str);
        textarea.setSelectionRange(pos[0], pos[0] + str.length);
        recordInput();
    }

    static replaceAll(sub: Searchable, str: string, start: number = textarea.selectionEnd) {
        const pos = textarea.value.searchAllPos(sub, start).toArray();
        if (pos.length === 0) return;
        textarea.value = textarea.value.replaceAllPos(pos, str);
        const diff = sum(pos.slice(0, -1).map(pos => pos[1] - pos[0] - str.length));
        textarea.setSelectionRange(pos.at(-1)![0] - diff, pos.at(-1)![0] + str.length - diff);
        recordInput();
    }
}

const SearchOperations = ['search', 'replace', 'replace-all'] as const;
type SearchOperation = typeof SearchOperations[number];
type SearchConfigs = { fromCursor: boolean, withRegex: boolean };

export class SearchScreen {
    private constructor() { }

    static get element() {
        return document.getElementById('search') as HTMLDialogElement;
    }

    static get sub() {
        return (document.getElementById('search-from') as HTMLInputElement).value;
    }

    static get str() {
        return (document.getElementById('search-to') as HTMLInputElement).value;
    }

    static get configs(): SearchConfigs {
        return {
            fromCursor: (document.getElementById('search-from-cursor') as HTMLInputElement).checked,
            withRegex: (document.getElementById('search-with-regex') as HTMLInputElement).checked
        };
    }

    static operate(operation: SearchOperation, configs: SearchConfigs) {
        const sub = configs.withRegex ? new RegExp(this.sub, 'g') : this.sub;
        const start = configs.fromCursor ? undefined : 0;
        switch (operation) {
            case "search":
                Searcher.search(sub, start);
                break;
            case "replace":
                Searcher.replace(sub, this.str, start);
                break;
            case "replace-all":
                Searcher.replaceAll(sub, this.str, start);
                break;
        }
    }

    static show() {
        this.element.show();
        document.getElementById('search-close')?.addEventListener('click', () => this.element.close());
        for (const op of SearchOperations) document.getElementById(`search-${op}`)
            ?.addEventListener('click', () => this.operate(op, this.configs));
    }
}