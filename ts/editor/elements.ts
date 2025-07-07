import * as parser from "../parser/parser.js";
import { ErrorManager } from "../utils/error-manager.js";
import { logger } from "../utils/logger.js";
import { file } from "./file-manager.js";
import { TextAreaManager } from "./text-manager.js";

export const textarea = document.getElementById('input') as HTMLTextAreaElement;
export const getManager = () => new TextAreaManager(textarea);

export const info = document.getElementById('info') as HTMLDivElement;
export const error = new ErrorManager(document.getElementById('error') as HTMLDivElement);

export function updateInfo(_?: Event) {
    error.clear();
    const manager = getManager();
    const filename = file.valid ? file.filename : 'Unnamed';
    info.innerText = `${filename}: Line ${manager.currentLineCount()}, Column ${manager.currentColumn()}`;
    scanControlBlocks();
}

export function scanControlBlocks() {
    const manager = getManager();
    try {
        return new parser.Paragraph(manager.lines).getControlBlocks();
    } catch (e) {
        logger.error(e);
        error.error(e);
    }
}

