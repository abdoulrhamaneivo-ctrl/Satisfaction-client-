import React from 'react';
/** Mention standard sous le seuil (jamais un chiffre seul ambigu). */
export declare function mentionBaseInsuffisante(nb: number): string;
/**
 * Tableau par question (critères de SATISFACTION seuls : SMILEY et scorés
 * valencés — TEXTE, choix catégoriels, NPS et CES ont leurs blocs dédiés
 * ou sont exclus des moyennes par construction serveur).
 */
export declare function TableauQuestions({ criteres }: {
    criteres: any[];
}): React.JSX.Element | null;
/**
 * Détail NPS d'une question (n, promoteurs/passifs/détracteurs, indice).
 * L'indice vaut '—' sous le seuil, le détail restant affiché.
 */
export declare function DetailNPS({ ligne }: {
    ligne: any;
}): React.JSX.Element;
/**
 * Barres motifs/problèmes : répartition des choix d'un critère catégoriel
 * (QCM Motif, CASES Problèmes). % = part des AVIS cochant l'option
 * (dénominateur = avis, pas coches) ; '—' sous le seuil, effectifs gardés.
 */
export declare function BarresRepartition({ idCritere, libelle, nbJours }: {
    idCritere: number;
    libelle: string;
    nbJours: number;
}): React.JSX.Element;
/**
 * Courbes par terme : moyenne globale mensuelle, NPS mensuel, et courbes
 * par question de satisfaction (3 plus gros volumes — au-delà, illisible
 * au pouce). L'axe part de 1/5 : une courbe démarrant à 0 exagérerait
 * les variations (même convention que TendanceMensuelle).
 */
export declare function CourbesParTerme({ nbMois }: {
    nbMois: number;
}): React.JSX.Element | null;
/**
 * Section composite Task 3 : tableau par question + détail NPS + barres
 * motifs/problèmes + courbes par terme. Une seule section à insérer par
 * page (Dashboard = vue agence, Synthèse = vue réseau pour la Direction).
 */
export declare function SectionKpiParTerme({ nbJours, nbMois, labelPeriode, }: {
    nbJours: number;
    nbMois: number;
    labelPeriode: string;
}): React.JSX.Element;
