export class ControlBlock {
    startPos;
    casesPosList;
    endPos;
    constructor(startPos, casesPosList, endPos) {
        this.startPos = startPos;
        this.casesPosList = casesPosList;
        this.endPos = endPos;
    }
}
export function scanControlBlocks(lines) {
    let controlTags = ['[Select]', '[Switch]'];
    let isControlTag = line => controlTags.some(value => line.startsWith(value));
    let ans = [];
    let stack = [];
    for (let [index, line] of lines.entries()) {
        if (isControlTag(line)) {
            stack.push(new ControlBlock(index, [], -1));
        }
        else if (line.startsWith('[Case]')) {
            if (stack.length === 0)
                throw `Error: [Case] tag out of control block at line ${index}`;
            else {
                stack[stack.length - 1].casesPosList.push(index);
            }
        }
        else if (line.startsWith('[End]')) {
            if (stack.length === 0)
                throw `Error: Extra [End] found at line ${index}`;
            else {
                let block = stack.pop();
                block.endPos = index;
                ans.push(block);
            }
        }
    }
    if(stack.length !== 0) throw `Error: Control Block ([Select]-[End] or [Switch]-[End]) not closed`;
    return ans;
}