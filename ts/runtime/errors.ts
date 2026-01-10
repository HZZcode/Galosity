import { logger } from "./logger.js";

const errorElement = document.getElementById('error') as HTMLDivElement;
const warnElement = document.getElementById('warning') as HTMLDivElement;

function fullString(msg: any): string {
    if (msg instanceof Error && msg.cause !== undefined)
        return `${msg}\nCaused by: ${fullString(msg.cause)}`;
    return msg.toString();
}

const error = {
    error: (msg: any) => errorElement.innerText = fullString(msg),
    warn: (msg: any) => warnElement.innerText = fullString(msg),
};

export function clearError() {
    error.error('');
    error.warn('');
}

const errorModes = ['error', 'warn'] as const;
type ErrorMode = typeof errorModes[number];

type ReturnType<TReturn, TDefault> = TReturn extends Promise<infer T>
    ? Promise<T | TDefault> : TReturn | TDefault;
type HandledType<This, TArgs extends any[], TReturn, TDefault = undefined>
    = (this: This, ...args: TArgs) => ReturnType<TReturn, TDefault>;
type HandlerType<TDefault = undefined> = <This, TArgs extends any[], TReturn>
    (method: (this: This, ...args: TArgs) => TReturn) => HandledType<This, TArgs, TReturn, TDefault>;

function HandleErrorHelper(mode: ErrorMode): HandlerType;
function HandleErrorHelper<TDefault>(mode: ErrorMode, defaultReturn: TDefault): HandlerType<TDefault>;
function HandleErrorHelper(mode: ErrorMode, defaultReturn?: any) {
    return (method: (...args: any[]) => any) => function (this: any, ...args: any[]) {
        try {
            const result = method.call(this, ...args);
            return result instanceof Promise ? result.catch(e => {
                logger[mode](e);
                error[mode](e);
                return defaultReturn;
            }) : result;
        } catch (e) {
            logger[mode](e);
            error[mode](e);
            return defaultReturn;
        }
    };
}

// I wish ECMAScript could support decorating functions so that we can get rid of calling `HandleError`
export function HandleError<This, TArgs extends any[], TReturn>
    (method: (this: This, ...args: TArgs) => TReturn): HandledType<This, TArgs, TReturn>;
export function HandleError(mode: ErrorMode): HandlerType;
export function HandleError<TDefault>(defaultReturn: TDefault): HandlerType<TDefault>;
export function HandleError<TDefault>(mode: ErrorMode, defaultReturn: TDefault): HandlerType<TDefault>;
export function HandleError(...args: any) {
    const arg = args[0];
    if (typeof arg === 'function') return HandleErrorHelper('error')(arg);
    if (arg in errorModes) return (HandleErrorHelper as any)(...args);
    return HandleErrorHelper('error', arg);
}

export const WrapError = (msg: string) => <This, TArgs extends any[], TReturn>
    (method: (this: This, ...args: TArgs) => TReturn) => function (this: This, ...args: TArgs) {
        try {
            const result = method.call(this, ...args);
            if (result instanceof Promise)
                return result.catch(e => {
                    throw new Error(msg, { cause: e });
                }) as TReturn;
            return result;
        } catch (e) {
            throw new Error(msg, { cause: e });
        }
    };