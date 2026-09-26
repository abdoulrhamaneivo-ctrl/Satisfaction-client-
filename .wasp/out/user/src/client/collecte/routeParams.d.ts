export type CollecteIdentifier = {
    kind: 'publicCode';
    code: string;
};
export declare function parseCollecteIdentifier(identifiant: string): CollecteIdentifier | null;
