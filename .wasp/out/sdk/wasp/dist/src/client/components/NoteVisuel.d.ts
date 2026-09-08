import React from 'react';
export declare const NOTE_CONFIG: readonly [{
    readonly note: 1;
    readonly icon: "😡";
    readonly label: "Très mécontent";
    readonly couleur: "destructive";
}, {
    readonly note: 2;
    readonly icon: "😟";
    readonly label: "Mécontent";
    readonly couleur: "orange";
}, {
    readonly note: 3;
    readonly icon: "😐";
    readonly label: "Neutre";
    readonly couleur: "amber";
}, {
    readonly note: 4;
    readonly icon: "🙂";
    readonly label: "Satisfait";
    readonly couleur: "lime";
}, {
    readonly note: 5;
    readonly icon: "🤩";
    readonly label: "Très satisfait";
    readonly couleur: "success";
}];
export declare const visuelPourNote: (score: number) => {
    readonly note: 1;
    readonly icon: "😡";
    readonly label: "Très mécontent";
    readonly couleur: "destructive";
} | {
    readonly note: 2;
    readonly icon: "😟";
    readonly label: "Mécontent";
    readonly couleur: "orange";
} | {
    readonly note: 3;
    readonly icon: "😐";
    readonly label: "Neutre";
    readonly couleur: "amber";
} | {
    readonly note: 4;
    readonly icon: "🙂";
    readonly label: "Satisfait";
    readonly couleur: "lime";
} | {
    readonly note: 5;
    readonly icon: "🤩";
    readonly label: "Très satisfait";
    readonly couleur: "success";
};
/** Pastille couleur associée à la note (badges, bordures). */
export declare const classeCouleurNote: (score: number) => string;
/** Barre de progression X/5 (lecture des avis, récapitulatifs). */
export declare const BarreNote: ({ score, max }: {
    score: number;
    max?: number;
}) => React.JSX.Element;
/** Grand visuel note : emoji + X/5 + libellé (cartes avis, récapitulatifs). */
export declare const GrandVisuelNote: ({ score, max }: {
    score: number;
    max?: number;
}) => React.JSX.Element;
//# sourceMappingURL=NoteVisuel.d.ts.map