import * as parser from '../parser/parser.js';
import { clearError, HandleError } from '../runtime/errors.js';
import { file } from './file-manager.js';
import { TextAreaManager } from './text-manager.js';

export const textarea = document.getElementById('input') as HTMLTextAreaElement;
export const getManager = () => new TextAreaManager(textarea);

export const info = document.getElementById('info') as HTMLDivElement;

export function updateInfo() {
    clearError();
    const manager = getManager();
    const filename = file.valid ? file.filename : 'Unnamed';
    info.innerText = `${filename}: Line ${manager.currentLineCount()}, Column ${manager.currentColumn()}`;
    scanControlBlocks();
}

export const scanControlBlocks = HandleError([])(() => {
    const manager = getManager();
    return new parser.Paragraph(manager.lines).getControlBlocks();
});