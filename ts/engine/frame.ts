import * as vars from "../vars/vars.js";
import { CustomData } from "./custom-data.js";

export class Frame {
    constructor(public pos: number, public varsFrame: vars.GalVars, 
        public resources: string, public customData: CustomData) { }

    withPos(pos: number) {
        this.pos = pos;
        return this;
    }

    toString() {
        return [this.pos, this.varsFrame, this.resources, this.customData]
            .map(data => data.toString()).join('\n');
    }

    static fromString(str: string) {
        const [pos, varsFrame, resources, customData] = str.split('\n');
        return new Frame(
            Number.parseInt(pos),
            vars.GalVars.fromString(varsFrame),
            resources,
            CustomData.fromString(customData)
        );
    }
}
