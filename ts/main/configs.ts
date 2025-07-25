import { Configs } from "../types";

export const configs: Configs = {
    files: true,
    edit: true,
    isDebug: process.env.NODE_ENV === 'development',
    theme: 0
};