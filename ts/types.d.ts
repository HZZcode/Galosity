import {
  IpcRenderer, OpenDialogOptions, OpenDialogReturnValue,
  SaveDialogOptions, SaveDialogReturnValue
} from "electron";
import { Dirent } from "fs";

type EditorData = { isDebug: boolean, file: string };
type EngineData = { content: string, filename?: string, isDebug: boolean, theme: number };

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
  invoke(channel: 'delete', path: string): Promise<boolean>;
  invoke(channel: 'openExternal', url: string): Promise<void>;
  invoke(channel: 'setTitle', title: string): Promise<void>;
  invoke(channel: 'engine-data', data: EngineData): Promise<void>;
  invoke(channel: 'log', str: string): Promise<void>;

  on(channel: 'send-data', handler: (_: unknown, data: EditorData) => void | Promise<void>): void;
  on(channel: 'engine-data', handler: (_: unknown, data: EngineData) => void | Promise<void>): void;
  on(channel: 'before-close', handler: (_: unknown) => void | Promise<void>): void;
}

declare global {
  namespace MathJax {
    function typeset(): void;
  }
}