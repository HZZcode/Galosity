import { Configs } from "../types";

function isDebug() {
    return process.env.NODE_ENV === 'development';
}

export const configs: Configs = {
    files: true,
    edit: true,
    isDebug: isDebug(), // this is editable
    packed: !isDebug(), // this one is not
    theme: 0,
    help: false
};