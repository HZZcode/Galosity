import {
  IpcRenderer, OpenDialogOptions, OpenDialogReturnValue,
  SaveDialogOptions, SaveDialogReturnValue
} from "electron";
import { Dirent } from "fs";

export interface GalIpcRenderer extends IpcRenderer {
  invoke(channel: 'showSaveDialog', options: SaveDialogOptions): Promise<SaveDialogReturnValue>;
  invoke(channel: 'showOpenDialog', options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
  invoke(channel: 'writeFile', path: string, content: string): Promise<void>;
  invoke(channel: 'readFile', path: string): Promise<string>;
  invoke(channel: 'resolve', pathname: string): Promise<string>;
  invoke(channel: 'hasFile', path: string): Promise<boolean>;
  invoke(channel: 'directory'): Promise<string>;
  invoke(channel: 'readdir', path: string, withFileTypes: false = false): Promise<string[]>;
  invoke(channel: 'readdir', path: string, withFileTypes: true): Promise<Dirent[]>;
  invoke(channel: 'exists', path: string): Promise<boolean>;
  invoke(channel: 'openExternal', url: string): Promise<void>;
  invoke(channel: 'test', data: { content: string, filename?: string, isDebug: boolean }): Promise<void>;
  invoke(channel: 'log', str: string): Promise<void>;

  on(channel: 'send-data', handler: (_: unknown, data:
    { isDebug: boolean, file: string }) => void | Promise<void>): void;
  on(channel: 'test-data', handler: (_: unknown, data:
    { content: string, filename: string, isDebug: boolean }) => void | Promise<void>): void;
  on(channel: 'before-close', handler: (_: unknown) => void | Promise<void>): void;
}

declare global {
  namespace MathJax {
    function typeset(): void;
  }
}