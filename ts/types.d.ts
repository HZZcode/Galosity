import { IpcRenderer, OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from "electron";

export interface GalIpcRenderer extends IpcRenderer {
  invoke(channel: 'showSaveDialog', options: SaveDialogOptions): Promise<SaveDialogReturnValue>;
  invoke(channel: 'showOpenDialog', options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
  invoke(channel: 'writeFile', path: string, content: string): Promise<void>;
  invoke(channel: 'readFile', path: string): Promise<string>;
  invoke(channel: 'resolve', pathname: string): Promise<string>;
  invoke(channel: 'hasFile', path: string): Promise<boolean>;
  invoke(channel: 'directory'): Promise<string>;
  invoke(channel: 'readdir', path: string): Promise<string[]>;
  invoke(channel: 'openExternal', url: string): Promise<void>;
  invoke(channel: 'test', data: { content: string, filename: string, isDebug: boolean }): Promise<void>;
  invoke(channel: 'log', str: string): Promise<void>;
}