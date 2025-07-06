import { ErrorManager } from "../utils/error-manager.js";
import { handleError, handleErrorAsWarning } from "../utils/error-handler.js";

export const error = new ErrorManager(
    document.getElementById('error') as HTMLDivElement, 
    document.getElementById('warning') as HTMLDivElement
);
export const errorHandled = handleError(error, true);
export const errorHandledAsWarning = handleErrorAsWarning(error, true);