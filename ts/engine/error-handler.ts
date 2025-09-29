import { handleError, handleErrorAsWarning } from "../utils/error-handler.js";
import { ErrorManager } from "../utils/error-manager.js";

export const error = new ErrorManager(
    document.getElementById('error') as HTMLDivElement, 
    document.getElementById('warning') as HTMLDivElement
);
export const errorHandled = handleError(error);
export const errorHandledAsWarning = handleErrorAsWarning(error);