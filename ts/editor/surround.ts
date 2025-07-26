import { getManager } from "./elements.js";
import { editTag } from "./history.js";

export const surround = (before: string, after: string) => () => {
    const manager = getManager();
    const start = manager.start - manager.beforeLinesLength();
    const end = manager.end - manager.beforeLinesLength();
    const tag = editTag();
    if (start !== end) {
        manager.insert(after, 0, end, tag);
        manager.move(-2);
        manager.insert(before, 0, start, tag);
    }
    else {
        manager.insert(before + after, undefined, undefined, tag);
        manager.move(-after.length);
    }
};
