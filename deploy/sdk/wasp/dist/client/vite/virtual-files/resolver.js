import * as path from "node:path";
export const makeVirtualFilesResolver = (files) => (rootPath) => {
    const filesWithAbsPath = files.map((d) => ({
        ...d,
        absPath: path.resolve(rootPath, path.basename(d.id)),
    }));
    const ids = new Map(filesWithAbsPath.map((d) => [d.id, d.absPath]));
    const loaders = new Map(filesWithAbsPath.map((d) => [d.absPath, d.load]));
    return { ids, loaders };
};
//# sourceMappingURL=resolver.js.map