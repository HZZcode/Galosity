export const isInside = (before, after) => (left, right) =>
    new RegExp(before).test(left.replaceAll(new RegExp(`.${before}.*?${after}`, 'g')))
    && new RegExp(after).test(right.replaceAll(new RegExp(`.${before}.*?${after}`, 'g')));
export const isHTML = isInside('<', '>');
export const isInterpolate = isInside('\\$\\{', '\\}');
export const indexOf = (str, char) => {
    for (const [i, c] of [...str].entries()) {
        const [left, right] = [str.substring(0, i), str.substring(i + 1)];
        if (c === char && !isInterpolate(left, right) && !isHTML(left, right))
            return i;
    }
    return -1;
};
export const splitWith = char => str => [
    str.substring(0, indexOf(str, char)).trim(),
    str.substring(indexOf(str, char) + 1).trim()
];
