import type {
  IpcRenderer, IpcRendererEvent, OpenDialogOptions, OpenDialogReturnValue,
  SaveDialogOptions, SaveDialogReturnValue
} from "electron";
import type { Dirent } from "fs";

export type Configs = {
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
export type EditorData = { configs: Configs, filename?: string };
export type EngineData = { configs: Configs, filename?: string };

export interface GalIpcRenderer extends IpcRenderer {
  invoke(channel: 'showSaveDialog', options: SaveDialogOptions): Promise<SaveDialogReturnValue>;
  invoke(channel: 'showOpenDialog', options: OpenDialogOptions): Promise<OpenDialogReturnValue>;

  invoke(channel: 'writeFile', path: string, content: string): Promise<void>;
  invoke(channel: 'writeFileEncrypted', path: string, content: string): Promise<void>;
  invoke(channel: 'readFile', path: string): Promise<string>;
  invoke(channel: 'readFileDecrypted', path: string): Promise<string>;
  invoke(channel: 'resolve', pathname: string, directory?: string): Promise<string>;
  invoke(channel: 'directory'): Promise<string>;
  invoke(channel: 'readdir', path: string, withFileTypes?: false): Promise<string[]>;
  invoke(channel: 'readdir', path: string, withFileTypes: true): Promise<Dirent[]>;
  invoke(channel: 'exists', path: string): Promise<boolean>;
  invoke(channel: 'delete', path: string): Promise<void>;

  invoke(channel: 'openExternal', url: string): Promise<void>;

  invoke(channel: 'editorTitle', title: string): Promise<void>;
  invoke(channel: 'engineTitle', title: string): Promise<void>;

  invoke(channel: 'engine-data', data: EngineData): Promise<void>;

  invoke(channel: 'log', str: any): Promise<void>;

  invoke(channel: 'exit', code?: number | string): Promise<void>;

  on(channel: 'editor-data', handler: (_: IpcRendererEvent, data: EditorData) => void | Promise<void>): this;
  on(channel: 'engine-data', handler: (_: IpcRendererEvent, data: EngineData) => void | Promise<void>): this;
  on(channel: 'before-close', handler: (_: IpcRendererEvent) => void | Promise<void>): this;
}

declare global {
  namespace MathJax {
    function typeset(): void;
  }
}