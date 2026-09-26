// src/shared/libelleReponse.test.ts
// Règle testée : l'IDENTITÉ de l'option détermine le libellé, jamais sa
// position ni son score. Scénarios réordonnés volontairement.
import { expect, test, describe } from 'vitest';
import { reponseEnClair, decrireReponse, libelleOuiNon, reponseEstPositive, libelleEchelle, libellesOptionsChoisis, borneEchelle, } from './libelleReponse';
const critere = (extra = {}) => ({
    type_reponse: 'QCM',
    libelle_critere: 'Satisfaction',
    orientation: 'HIGHER_BETTER',
    scoring_mode: null,
    options_reponse: null,
    ...extra,
});
describe('QCM : le libellé vient de l\'identité de l\'option, pas de sa position', () => {
    test('choix voulu en 2e position, score 2 → le BON libellé', () => {
        // Le piège historique : options[score - 1] aurait renvoyé « Neutre ».
        const r = {
            score_brut: 2,
            score_officiel: 2,
            critere: critere(),
            optionsChoisies: [{ option: { libelle: 'Très insatisfait' } }],
        };
        expect(reponseEnClair(r)).toBe('Très insatisfait');
    });
    test("même option métier, ordre d'affichage différent → même libellé", () => {
        const ordreA = 'Très satisfait,Neutre,Très insatisfait';
        const ordreB = 'Très insatisfait,Neutre,Très satisfait';
        const a = {
            score_brut: 5,
            critere: critere({ options_reponse: ordreA }),
            optionsChoisies: [{ option: { libelle: 'Très satisfait' } }],
        };
        const b = {
            score_brut: 5,
            critere: critere({ options_reponse: ordreB }),
            optionsChoisies: [{ option: { libelle: 'Très satisfait' } }],
        };
        expect(reponseEnClair(a)).toBe(reponseEnClair(b));
        expect(reponseEnClair(b)).toBe('Très satisfait');
    });
    test('option désactivée (actif=false) mais toujours liée → libellé restitué', () => {
        const r = {
            score_brut: 1,
            critere: critere(),
            optionsChoisies: [{ option: { libelle: 'Ancien libellé' } }],
        };
        expect(reponseEnClair(r)).toBe('Ancien libellé');
    });
    test('sans identité d\'option → null, JAMAIS de « Option n°X » deviné', () => {
        const r = { score_brut: 2, critere: critere({ options_reponse: 'A,B,C' }) };
        expect(reponseEnClair(r)).toBeNull();
        expect(decrireReponse(r)).toBe('Satisfaction: —');
        expect(decrireReponse(r)).not.toContain('n°');
    });
    test('le commentaire propre reste un repli (ligne legacy sans option liée)', () => {
        const r = { score_brut: 2, commentaire_texte: 'Neutre', critere: critere() };
        // Le commentaire global de l'avis diffère : celui-ci est bien spécifique.
        expect(reponseEnClair(r, { texteGroupe: 'Attente au guichet' })).toBe('Neutre');
        // S'il est identique au global, il ne prouve rien sur CE choix : on ne
        // l'attribue pas à la question.
        expect(reponseEnClair(r, { texteGroupe: 'Neutre' })).toBeNull();
    });
});
describe('OUI/NON : l\'orientation du critère décide du sens', () => {
    test('HIGHER_BETTER : Oui = 5, Non = 1', () => {
        const c = critere({ type_reponse: 'OUI_NON', orientation: 'HIGHER_BETTER' });
        expect(libelleOuiNon({ score_brut: 5, critere: c })).toBe('Oui');
        expect(libelleOuiNon({ score_brut: 1, critere: c })).toBe('Non');
        expect(reponseEstPositive({ score_brut: 5, critere: c })).toBe(true);
        expect(reponseEstPositive({ score_brut: 1, critere: c })).toBe(false);
    });
    test('LOWER_BETTER (« Avez-vous rencontré un problème ? ») : Oui = 1', () => {
        const c = critere({ type_reponse: 'OUI_NON', orientation: 'LOWER_BETTER' });
        expect(libelleOuiNon({ score_brut: 1, critere: c })).toBe('Oui');
        expect(libelleOuiNon({ score_brut: 5, critere: c })).toBe('Non');
        // …et la polarité de l'expérience est l'inverse de la réponse.
        expect(reponseEstPositive({ score_brut: 1, critere: c })).toBe(false);
    });
    test('score hors encodage 1/5 → null (rien n\'est supposé)', () => {
        expect(libelleOuiNon({ score_brut: 3, critere: critere({ type_reponse: 'OUI_NON' }) })).toBeNull();
        expect(reponseEstPositive({ score_brut: 3, critere: critere({ type_reponse: 'OUI_NON' }) })).toBeNull();
    });
    test('score_officiel prime sur score_brut', () => {
        const c = critere({ type_reponse: 'OUI_NON', orientation: 'LOWER_BETTER' });
        expect(libelleOuiNon({ score_brut: 5, score_officiel: 1, critere: c })).toBe('Oui');
    });
});
describe('CASES : toutes les options choisies, en clair', () => {
    test('jointure → libellés dans l\'ordre', () => {
        const r = {
            score_brut: null,
            critere: critere({ type_reponse: 'CASES' }),
            optionsChoisies: [{ option: { libelle: 'Attente' } }, { option: { libelle: 'Guichet fermé' } }],
        };
        expect(reponseEnClair(r)).toBe('Attente • Guichet fermé');
    });
    test('repli legacy : libellés déjà stockés dans le commentaire', () => {
        const r = {
            score_brut: null,
            critere: critere({ type_reponse: 'CASES' }),
            commentaire_texte: 'Attente • Guichet fermé',
        };
        expect(reponseEnClair(r)).toBe('Attente • Guichet fermé');
    });
    test('aucun choix, aucun texte → null', () => {
        expect(reponseEnClair({ score_brut: null, critere: critere({ type_reponse: 'CASES' }) })).toBeNull();
    });
});
describe('Échelles et CES', () => {
    test('ECHELLE : valeur/max', () => {
        const r = { score_brut: 8, critere: critere({ type_reponse: 'ECHELLE', options_reponse: '1,10' }) };
        expect(libelleEchelle(r)).toBe('8/10');
    });
    test('CES 1-7 : effort BAS = libellé bon (reste dans le sens du CES)', () => {
        const facile = {
            score_brut: 1,
            critere: critere({ type_reponse: 'ECHELLE', scoring_mode: 'CES', orientation: 'LOWER_BETTER', options_reponse: '1,7' }),
        };
        const difficile = { ...facile, score_brut: 7 };
        expect(libelleEchelle(facile)).toBe('1/7 · Très facile');
        expect(libelleEchelle(difficile)).toBe('7/7 · Très difficile');
    });
    test('NPS : /10 natif', () => {
        expect(libelleEchelle({ score_brut: 9, critere: critere({ type_reponse: 'NPS' }) })).toBe('9/10');
    });
    test('bornes illisibles → valeur nue, jamais de division par un déchet', () => {
        expect(borneEchelle({ options_reponse: 'nawak' })).toBeNull();
        expect(libelleEchelle({ score_brut: 3, critere: critere({ type_reponse: 'ECHELLE', options_reponse: 'nawak' }) })).toBe('3');
    });
});
describe('SMILEY et divers', () => {
    test('SMILEY : note /5', () => {
        expect(reponseEnClair({ score_brut: 4, critere: critere({ type_reponse: 'SMILEY' }) })).toBe('4/5');
    });
    test('TEXTE : verbatim, y compris identique au commentaire global', () => {
        const r = { score_brut: null, commentaire_texte: 'Service rapide', critere: critere({ type_reponse: 'TEXTE' }) };
        expect(reponseEnClair(r, { texteGroupe: 'Autre commentaire' })).toBe('Service rapide');
    });
    test('libellés vides filtrés', () => {
        const r = {
            critere: critere(),
            optionsChoisies: [{ option: { libelle: '  ' } }, { option: { libelle: 'Neutre' } }],
        };
        expect(libellesOptionsChoisis(r)).toEqual(['Neutre']);
    });
});
//# sourceMappingURL=libelleReponse.test.js.map