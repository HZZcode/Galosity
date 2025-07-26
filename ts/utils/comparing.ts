export type Comparism<T> = (self: T, other: T) => boolean;

export const equals = <T>(self: T, other: T) => self === other;
export const notEquals = <T>(self: T, other: T) => self !== other;
export const less = <T>(self: T, other: T) => self < other;
export const greater = <T>(self: T, other: T) => self > other;
export const lessOrEqual = <T>(self: T, other: T) => self <= other;
export const greaterOrEqual = <T>(self: T, other: T) => self >= other;

export const falsy = <TArgs extends any[]>(..._: TArgs) => false;
export const truey = <TArgs extends any[]>(..._: TArgs) => true;