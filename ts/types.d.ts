/**
 * Return type of `electron.dialog.showSaveDialog`.
 *  */ 
interface SaveDialogReturnValue {
  canceled: boolean;
  filePath: string;
  bookmark?: string;
}

/**
 * Return type of `electron.dialog.showOpenDialog`.
 *  */ 
interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
  bookmarks?: string[];
}