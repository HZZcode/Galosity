import type { ClassOf } from "./types";

const classSpecials = ['constructor'];
const staticSpecials = ['length', 'name', 'prototype'];

export function AutoBind<Type extends object, Class extends ClassOf<Type>>(target: Class) {
    class NewClass extends (target as any) {
        constructor(...args: any[]) {
            // eslint-disable-next-line constructor-super
            super(...args);
            // We must access with descriptors to avoid getters being called
            Object.entries(Object.getOwnPropertyDescriptors(target.prototype)).filter(([name, descriptor]) =>
                !classSpecials.includes(name) && typeof descriptor.value === 'function')
                .forEach(([name]) => this[name] = this[name].bind(this));
        }
    }
    Object.entries(Object.getOwnPropertyDescriptors(target)).filter(([name, descriptor]) =>
        !staticSpecials.includes(name) && typeof descriptor.value === 'function')
        .forEach(([name, descriptor]) => Object.defineProperty(NewClass, name, {
            ...descriptor, value: descriptor.value.bind(NewClass)
        }));
    return NewClass as unknown as Class;
}