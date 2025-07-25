import { firstDifferents, lastDifferents } from "../utils/array.js";
import { getManager } from "./elements.js";
import { EditData, Lines } from "./history.js";
import { TextAreaManager, textHistory } from "./text-manager.js";

let previous: TextAreaManager | undefined = undefined;

export function recordInput() {
    const current = getManager();
    if (previous !== undefined)
        textHistory.record(compare(previous.lines, current.lines));
    previous = current;
}

function compare(before: string[], after: string[]) {
    const starts = firstDifferents(before, after);
    if (starts === undefined) return EditData.empty();
    const ends = lastDifferents(before, after, starts[0]);
    if (ends === undefined) return EditData.empty();
    return new EditData(new Lines(starts[0], ends[0], before.slice(starts[0], ends[0] + 1)),
        after.slice(starts[1], ends[1] + 1));
} // Seems inefficient but fine in fact