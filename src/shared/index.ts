export const extend = Object.assign;

export function isObject(val: any) {
  return val !== null && typeof val === "object";
}

export function hasChanged(oldValue: any, newValue: any) {
  return !Object.is(oldValue, newValue);
}
