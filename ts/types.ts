import type { Dirent } from "fs";

import type { Setupable } from "./plugin/loader";

export interface Configs {
  files: boolean,
  edit: boolean,
  autoSave: number, // in seconds
  scriptTest: boolean,
  isDebug: boolean,
  readonly packed: boolean,
  theme: number,
  encrypt: boolean,
  help: boolean
}
export interface Data { configs: Configs, filename?: string }
export type Environment = 'editor' | 'engine';

export interface HandlerRegistry {
  channel: string;
  args: string[];
  code: string;
}

export interface API {
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
  invoke(channel: 'add-handler', registry: HandlerRegistry): Promise<void>;
}

declare global {
  namespace MathJax {
    function typeset(): void;
  }

  namespace galosity {
    const plugins: Record<string, any>;
    let pluginSetups: Record<string, Setupable>;
  }
}