import type { Mode } from '../types.js';

export const mode: Mode = 'electron';

export const switchMode = <T>(funcs: Record<Mode, () => T>) => funcs[mode]();