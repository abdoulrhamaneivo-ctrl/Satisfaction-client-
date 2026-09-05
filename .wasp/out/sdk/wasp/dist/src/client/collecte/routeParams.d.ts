type CollecteIdentifier = {
    kind: 'guichetId';
    guichetId: number;
} | {
    kind: 'publicCode';
    code: string;
};
export declare function parseCollecteIdentifier(identifiant: string): CollecteIdentifier | null;
export {};
//# sourceMappingURL=routeParams.d.ts.map