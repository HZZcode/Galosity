/// <reference path="../../dts/exports.d.ts" />

class SimpleComplete extends galosity.editor.completer.AbstractComplete {
    text;

    /** @param {string} text  */
    constructor(text) {
        super();
        this.text = text;
    }

    getList() {
        return [this.text];
    }

    complete() {
        return this.text;
    }
}

/** @param {galosity.plugin.metaInfo.MetaInfo} info */
export function setup(info) {
    if (info.environment !== 'editor') return false;
    galosity.editor.tabCompleters.TabCompleters.register(new galosity.editor.tabCompleters.TabCompleter(
        new SimpleComplete('[Select]\n[Case]\n[End]'),
        context => context.front.trim() === '\\se',
        context => context.front
    ));
    galosity.editor.tabCompleters.TabCompleters.register(new galosity.editor.tabCompleters.TabCompleter(
        new SimpleComplete('[Switch]\n[Case]\n[End]'),
        context => context.front.trim() === '\\sw',
        context => context.front
    ));
    galosity.editor.tabCompleters.TabCompleters.register(new galosity.editor.tabCompleters.TabCompleter(
        new SimpleComplete('[Func] f()\n[Return]'),
        context => context.front.trim() === '\\f',
        context => context.front
    ));
    return true;
}