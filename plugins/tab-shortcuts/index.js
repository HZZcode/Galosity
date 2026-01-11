/// <reference path='../../dts/exports.d.ts' />

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

/**
 * @param {string} part 
 * @param {string} text 
 */
function register(part, text) {
    galosity.editor.tabCompleters.TabCompleters.register(new galosity.editor.tabCompleters.TabCompleter(
        new SimpleComplete(text),
        context => context.front.trim() === part,
        context => context.front
    ));
}

/** @param {galosity.plugin.metaInfo.MetaInfo} info */
export function setup(info) {
    info.version.atLeast('2.4');
    if (info.environment !== 'editor') return false;
    register('\\se', '[Select]\n[Case]:\n[End]');
    register('\\sw', '[Switch]\n[Case]:\n[End]');
    register('\\f', '[Func] f()\n[Return]');
    register('\\a', '[Anchor]\n[Jump]');
    register('\\j', '[Jump]\n[Anchor]');
    return true;
}