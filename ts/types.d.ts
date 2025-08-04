import {
  IpcRenderer, OpenDialogOptions, OpenDialogReturnValue,
  SaveDialogOptions, SaveDialogReturnValue
} from "electron";
import { Dirent } from "fs";

type Configs = {
  files: boolean,
  edit: boolean,
  autoSave: number, // seconds
  scriptTest: boolean,
  isDebug: boolean,
  readonly packed: boolean,
  theme: number,
  encrypt: boolean,
  help: boolean
};
type EditorData = { configs: Configs, filename?: string };
type EngineData = { configs: Configs, filename?: string };

export interface GalIpcRenderer extends IpcRenderer {
  invoke(channel: 'showSaveDialog', options: SaveDialogOptions): Promise<SaveDialogReturnValue>;
  invoke(channel: 'showOpenDialog', options: OpenDialogOptions): Promise<OpenDialogReturnValue>;

  invoke(channel: 'writeFile', path: string, content: string): Promise<void>;
  invoke(channel: 'readFile', path: string): Promise<string>;
  invoke(channel: 'readFileDecrypted', path: string): Promise<string>;
  invoke(channel: 'resolve', pathname: string): Promise<string>;
  invoke(channel: 'directory'): Promise<string>;
  invoke(channel: 'readdir', path: string, withFileTypes: false = false): Promise<string[]>;
  invoke(channel: 'readdir', path: string, withFileTypes: true): Promise<Dirent[]>;
  invoke(channel: 'exists', path: string): Promise<boolean>;
  invoke(channel: 'delete', path: string): Promise<boolean>;

  invoke(channel: 'openExternal', url: string): Promise<void>;

  invoke(channel: 'editorTitle', title: string): Promise<void>;
  invoke(channel: 'engineTitle', title: string): Promise<void>;

  invoke(channel: 'engine-data', data: EngineData): Promise<void>;

  invoke(channel: 'log', str: any): Promise<void>;

  invoke(channel: 'exit', code?: number | string): Promise<void>;

  on(channel: 'editor-data', handler: (_: unknown, data: EditorData) => void | Promise<void>): void;
  on(channel: 'engine-data', handler: (_: unknown, data: EngineData) => void | Promise<void>): void;
  on(channel: 'before-close', handler: (_: unknown) => void | Promise<void>): void;
}

declare global {
  namespace MathJax {
    function typeset(): void;
  }
}