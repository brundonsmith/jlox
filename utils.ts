
export function exists<T>(x: T): x is NonNullable<T> {
    return x != null;
}

export function given<T, R>(val: T|null|undefined, func: (v: T) => R): R|null|undefined {
    if (val != null) {
        return func(val);
    } else {
        return val as null|undefined;
    }
}