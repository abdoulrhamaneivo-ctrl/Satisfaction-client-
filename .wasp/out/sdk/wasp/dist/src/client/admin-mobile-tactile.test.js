// src/client/admin-mobile-tactile.test.ts
// ============================================================================
// Task 1 (SDD 2026-10-04) — Audit tactile admin web+mobile (TDD RED→GREEN).
//
// jsdom ne mesure aucune géométrie (pas de layout, pas de contraste rendu) :
// cet audit est donc STATIQUE — il vérifie que les conventions tactiles
// exigées par le brief sont présentes dans le code source :
//   - cibles tactiles >= 44px (min-h-[44px] / min-h-11 / h-11 / size-11),
//   - dialogs scrollables en bottom-sheet mobile,
//   - pas de débordement horizontal à 360px (gouttières px-4, tableaux
//     masqués/overflow sur mobile, viewport-fit=cover).
//
// L'audit axe-core RENDU reste couvert par les suites a11y existantes
// (*.a11y.test.tsx) — voir le rapport de tâche pour la liste exécutée.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const lire = (rel) => readFileSync(resolve(racine, rel), 'utf8');
describe('Task 1 — shell + nav tactile', () => {
    test('tab-bar mobile avec 4 actions (Dashboard, Avis, Alertes, +Créer)', () => {
        expect(existsSync(resolve(racine, 'src/client/components/MobileTabBar.tsx'))).toBe(true);
        const app = lire('src/client/App.tsx');
        expect(app, 'App doit monter la tab-bar mobile').toContain('MobileTabBar');
        const tabbar = lire('src/client/components/MobileTabBar.tsx');
        for (const libelle of ['Dashboard', 'Avis', 'Alertes', 'Créer']) {
            expect(tabbar, `tab-bar : action « ${libelle} » manquante`).toContain(libelle);
        }
        expect(tabbar, 'tab-bar : nav landmark nommé requis').toContain('Navigation principale mobile');
        // Zone tactile : chaque action >= 44px + safe-area iOS.
        expect(tabbar, 'tab-bar : actions >= 44px').toMatch(/min-h-\[44px\]|min-h-11/);
        expect(tabbar, 'tab-bar : safe-area iOS requise').toContain('safe-area-inset-bottom');
    });
    test('Toaster bottom-center (pouce, pas masqué par le drawer)', () => {
        const app = lire('src/client/App.tsx');
        expect(app, 'Toaster doit être bottom-center sur mobile').toContain('bottom-center');
        // Fix round 1 : le retrait tab-bar (5.5rem) est mobile-only (max-sm:) —
        // desktop inchangé.
        const toast = lire('src/client/components/ui/toast.tsx');
        expect(toast, 'toast : retrait tab-bar réservé mobile (max-sm:)').toContain('max-sm:');
    });
    test('head : viewport-fit=cover + theme-color', () => {
        const head = lire('src/client/head.wasp.ts');
        expect(head, 'viewport-fit=cover requis (encoche iOS)').toContain('viewport-fit=cover');
        expect(head, 'theme-color requis').toContain('theme-color');
    });
    test('PageShell : gouttières réduites sur mobile, desktop inchangé', () => {
        const shell = lire('src/client/components/PageShell.tsx');
        expect(shell, 'PageShell mobile : px-4 requis').toContain('px-4');
        expect(shell, 'PageShell desktop : lg:p-10 conservé').toContain('lg:p-10');
    });
    test('onglets PageTopNav : 44px de hauteur tactile', () => {
        const shell = lire('src/client/components/PageShell.tsx');
        expect(shell, 'onglets >= 44px').toMatch(/min-h-\[44px\]|min-h-11/);
    });
});
describe('Task 1 — pages tactiles', () => {
    test('Planning : boutons 24px → 44px + date h-11', () => {
        const page = lire('src/client/pages/PlanningPage.tsx');
        // Les boutons d'édition/suppression d'affectation étaient en size-6 (24px).
        expect(page, 'Planning : aucun bouton icon size-6 (24px) restant').not.toContain('size-6 ');
        expect(page, 'Planning : date en h-11').toContain('h-11');
        expect(page, 'Planning : cibles >= 44px').toMatch(/min-h-\[44px\]|min-h-11/);
    });
    test('Dashboard : tableaux → cartes sur mobile + exports en menu unique', () => {
        const page = lire('src/client/pages/DashboardPage.tsx');
        // Le tableau « derniers avis » (min-w-640) est masqué sur mobile au
        // profit de cartes ; le tableau reste visible dès sm (desktop inchangé).
        expect(page, 'Dashboard : version cartes mobile requise').toContain('sm:hidden');
        expect(page, 'Dashboard : tableau réservé sm+ requis').toContain('hidden sm:block');
        // Les deux boutons d'export côte à côte débordent à 360px → menu unique.
        expect(page, 'Dashboard : menu Exports unique requis').toMatch(/Exports?/);
    });
    test('Avis : filtres en accordéon sur mobile', () => {
        const page = lire('src/client/pages/AvisPage.tsx');
        expect(page, 'Avis : accordéon de filtres requis').toMatch(/Accordion|details/);
        expect(page, 'Avis : panneau desktop conservé (hidden lg:block)').toMatch(/hidden lg:block|lg:hidden/);
    });
    test('Guichets + Agences : liste d’abord sur mobile (formulaire après)', () => {
        const guichets = lire('src/client/pages/GuichetsPage.tsx');
        expect(guichets, 'Guichets : ordre mobile liste-first requis').toMatch(/order-1|order-2/);
        const agences = lire('src/client/pages/GestionAgencesPage.tsx');
        expect(agences, 'Agences : ordre mobile liste-first requis').toMatch(/order-1|order-2/);
    });
    test('Alertes : boutons pleine largeur sur mobile', () => {
        const page = lire('src/client/pages/AlertesTachesPage.tsx');
        expect(page, 'Alertes : boutons w-full sur mobile').toContain('w-full sm:w-auto');
    });
    test('pas de paliers morts 375/425 : aucun min-w fixe sans préfixe sm+', () => {
        // DataTable portait min-w-[640px] nu → scroll interne forcé même quand
        // il est visible. Le tableau dashboard est désormais masqué sur mobile ;
        // la table partagée ne doit plus imposer de largeur minimale sous sm.
        const table = lire('src/client/components/ui/DataTable.tsx');
        expect(table, 'DataTable : min-w réservé sm+ (pas de 640px nu)').not.toContain('w-full min-w-[640px]');
    });
});
describe('Task 1 — dialogs bottom-sheet scrollables', () => {
    test('DialogContent : bottom-sheet mobile scrollable, centré desktop', () => {
        const dialog = lire('src/client/components/ui/dialog.tsx');
        expect(dialog, 'dialog : max-h-[90vh] requis').toContain('max-h-[90vh]');
        expect(dialog, 'dialog : overflow-y-auto requis').toContain('overflow-y-auto');
        expect(dialog, 'dialog : rounded-t-3xl mobile requis').toContain('rounded-t-3xl');
        expect(dialog, 'dialog : centrage desktop conservé (sm:)').toContain('sm:top-[50%]');
        // Contrainte globale « desktop inchangé » (fix round 1) : le rayon
        // desktop d'origine est sm:rounded-lg — sm:rounded-3xl est interdit.
        expect(dialog, 'dialog : rayon desktop sm:rounded-lg conservé').toContain('sm:rounded-lg');
        expect(dialog, 'dialog : aucun sm:rounded-3xl (desktop modifié)').not.toContain('sm:rounded-3xl');
    });
    test('AlertDialogContent : bottom-sheet mobile scrollable, centré desktop', () => {
        const alert = lire('src/client/components/ui/alert-dialog.tsx');
        expect(alert, 'alert-dialog : max-h-[90vh] requis').toContain('max-h-[90vh]');
        expect(alert, 'alert-dialog : overflow-y-auto requis').toContain('overflow-y-auto');
        expect(alert, 'alert-dialog : rounded-t-3xl mobile requis').toContain('rounded-t-3xl');
    });
    test('bouton fermer des dialogs : cible >= 44px', () => {
        const dialog = lire('src/client/components/ui/dialog.tsx');
        expect(dialog, 'dialog : bouton fermer >= 44px').toMatch(/min-h-\[44px\]|min-h-11|size-11/);
    });
});
//# sourceMappingURL=admin-mobile-tactile.test.js.map