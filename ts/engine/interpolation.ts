import { HandleError } from '../runtime/errors.js';
import { isLatex, splitWith } from '../runtime/split.js';
import type * as vars from '../vars/vars.js';

class Interpolations {
    funcs: Record<string, (_: string) => string> = {};
    register(tagChar: string, func: (_: string) => string) {
        if (tagChar in this.funcs) throw new Error(`Multiple registration of interpolation for ${tagChar}`);
        this.funcs[tagChar] = func;
    }
    getTagRegex() {
        return new RegExp(`[${Object.keys(this.funcs).join('')}](\\{([^{}]*?)\\})`, 'g');
    }
    process(text: string) {
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

export function escape(text: string) {
    return text.replaceAll(/(?<!\\)\\n/g, '\n').replaceAll(/\\\\/g, '\\');
}

export function interpolate(text: string, varsFrame: vars.GalVars) {
    if (typeof text !== 'string') return text;
    const interpolation = new Interpolations();
    interpolation.register('$', sub => {
        let result = sub;
        HandleError('warn')(() => result = varsFrame.eval(sub).toString())();
        return result;
    });
    interpolation.register('^', sub => `<sup>${sub}</sup>`);
    interpolation.register('_', sub => `<sub>${sub}</sub>`);
    interpolation.register('%', sub => {
        const [text, href] = splitWith(':')(sub);
        return `<a href='${href}' target='_blank' rel='noopener noreferrer'>${text === '' ? href : text}</a>`;
    });
    interpolation.register('~', sub => {
        const [rb, rt] = splitWith(':')(sub);
        return `<ruby><rb>${rb}</rb><rt>${rt}</rt><rp>(${rt})</rp></ruby>`;
    });
    interpolation.register('*', sub => `<button class='function'><i class='fa-solid ${sub}'></i></button>`);
    return interpolation.process(text).replaceAll(/(?<!\\)\\n/g, '<br>').replaceAll(/\\\\/g, '\\');
}
