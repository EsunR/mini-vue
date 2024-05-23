export const extend = Object.assign;

export const EMPTY_OBJ = {};

export function isObject(val: any) {
    return val !== null && typeof val === "object";
}

export function hasChanged(oldValue: any, newValue: any) {
    return !Object.is(oldValue, newValue);
}

export const hasOwn = (o: object, key: string) =>
    Object.prototype.hasOwnProperty.call(o, key);

/**
 * 将字符串首字母大写
 */
export const capitalized = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

/**
 * 将 kebab-case 转换为 camelCase
 */
export const camelized = (str: string) =>
    str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ""));
