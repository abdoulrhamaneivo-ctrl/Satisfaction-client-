export const clsx = (...classes) => {
    return classes.filter(Boolean).join(" ");
};
export const tokenObjToCSSVars = (prefix, tokenObj) => Object.fromEntries(Object.entries(tokenObj).map(([key, value]) => [
    `--${prefix}-${key}`,
    value,
]));
//# sourceMappingURL=util.js.map