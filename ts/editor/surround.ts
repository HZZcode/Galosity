import { getManager } from "./elements.js";

export const surround = (before: string, after: string) => () => {
    const manager = getManager();
    const start = manager.start - manager.beforeLinesLength();
    const end = manager.end - manager.beforeLinesLength();
    if (start !== end) {
        manager.insert(after, 0, end);
        manager.move(-2);
        manager.insert(before, 0, start);
    }
    else {
        manager.insert(before + after);
        manager.move(-after.length);
    }
};
