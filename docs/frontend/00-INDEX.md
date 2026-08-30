# YEBA — INDEX DOCUMENTATION FRONTEND
## Doc 00 — Ordre de lecture + décisions produit + analyse des écarts

> **Projet réel** : `~/Bureau/app` (Wasp + React + Prisma, dépôt principal — le projet « PROJET YEBA » séparé a été supprimé le 2026-08-29, son contenu utile est migré ICI).
> **Cahier des charges source** : `docs/cahier-des-charges-fonctionnel.md` (48 sections).
> **Audit du code existant** : `docs/PLATEFORME.md` (rôles, RLS, flux avis→alerte→tâche — À LIRE en second).

## 1. Ordre de lecture

| # | Document | Contenu |
|---|---|---|
| 1 | `docs/PLATEFORME.md` | L'architecture métier RÉELLE (audit du code) — la vérité du backend |
| 2 | `docs/frontend/cahier-des-charges-fonctionnel.md` | La source métier officielle (§1-§48) |
| 3 | `docs/frontend/00-INDEX.md` (ce fichier) | Décisions + écarts fonctionnels |
| 4 | `docs/frontend/02-perimetre.md` | Matrice rôles étendue, RG01-RG18 en comportements UI |
| 5 | `docs/frontend/04-charte-graphique-poste-ci.md` | Couleurs, contrastes mesurés, logo |
| 6 | `docs/frontend/03-design-system-mint.md` | Le langage du template Mint transposé + tokens app |
| 7 | `docs/frontend/08-confidentialite-anonymat.md` | RG12-RG18 (chef d'agence / Direction chiffres seuls) |
| 8 | `docs/frontend/09-qr-codes-collecte.md` | QR exports multi-formats + partage |
| 9 | `docs/frontend/10-spec-refonte-landing.md` | LA SPEC de la refonte UX/UI (template Mint) |
| 10 | `docs/frontend/patron-spec-page.md` | Patron des specs (10 sections) |

Référence design : `design-template/Mint - Portfolio React Template/` (template fourni par Ivo — on TRANSPOSE son langage, jamais on ne recrée un équivalent).

## 2. État réel du disque (vérifié 2026-08-29)

- **Backend + app complète EXISTANTS** : 12 pages (Dashboard, Guichets, Planning, Collecte `/q/:guichetId`, Avis, Criteres, Alertes-Taches, Archives, Agences, Personnel, Settings, Landing), auth email+password (`src/auth/`), RLS (`rowLevelSecurity.ts`), 4 rôles DIRECTION/QUALITE/CHEF_AGENCE/AGENT, jobs (alerteSilence, rapportMensuel, analyserAvisIA, archivage, relanceTache), IA (OpenRouter/DeepSeek), KitGuichet (QR exports PNG A4/A5/carte), 25 composants shadcn/ui + design system `src/client/components/ds/`.
- **Tokens actuels (Main.css)** : `--brand-green` hsl(149 100% 33%) ≈ vert logo, `--warning` hsl(45 100% 50%) = **#FFD100 exact** (jaune Poste), police **Satoshi** chargée, rayons 0.75rem, fond chaud hsl(45 28% 97%).
- **Assets** : `public/hero-1..5.jpg` (photos terrain), `yeba-howto.mp4`, `la_poste_ci_bg.png`, `yeba-logo.svg`.
- **Design** : composant `AmbientBackground` (blobs verts/jaunes flous 28-36s), `hero-carousel` CSS (crossfade 25s), ease signature `[0.16, 1, 0.3, 1]`.

## 3. DÉCISIONS PRODUIT (journal — ne jamais réécrire l'historique)

| Date | Décision | Origine |
|---|---|---|
| 2026-08-29 | Le projet séparé `PROJET YEBA` est SUPPRIMÉ ; toute la documentation utile est migrée dans `docs/frontend/` du dépôt `app` | Ivo |
| 2026-08-29 | La refonte UX/UI (landing + écrans) transpose le **langage du template Mint** DANS le design system existant (shadcn + ds/) — on ne remplace ni shadcn ni les composants ds, on applique la grammaire visuelle Mint (navbar extraLarge, UPPERCASE hover jaune, boutons à bordure inversée au hover, footer noir BACK TO TOP, drawer mobile noir, typographie géante weight800) | Ivo |
| 2026-08-29 | Typographie UI = **Satoshi** (déjà chargée, identité du produit) ; le logo reste en Poppins dans son SVG. La charte §4 du doc 04 (Poppins partout) est amendée sur ce point | Constat code |
| 2026-08-29 | CONFIDENTIALITÉ PAR NIVEAU (RG12-RG18, Doc 08) : coordonnées client OPTIONNELLES (finalité recontact) ; le CHEF_AGENCE voit les avis de son agence ; la DIRECTION ne voit que chiffres/agrégats/thèmes — JAMAIS de verbatims ; k-anonymat ≥ 5 par agent ; garde-fou RH ; accès Qualité journalisé | Retour terrain chef d'agence + Ivo |
| 2026-08-29 | Bloc recontact SANS question : champs simplement présents, vides = rien envoyé, normalisation +225 | Ivo |

## 4. ANALYSE DES ÉCARTS — cahier des charges §47 (23 critères de réussite) vs code

**COUVERTS par le code existant** (vérifié) : 1 entreprise, 2 agences, 3 utilisateurs, 4 guichets, 5 opérations, 6 critères, 7 questionnaires adaptés (getFormDefinitionForGuichet + fallback agencyCriteres), 8 avis (CollectePage), 9 doublons (VoteAntiRejeu + id_soumission), 10 stats (queries.ts + regrouperParSoumission), 11 comparaison agences (Dashboard), 12 guichets (DashboardCharts), 13 agents (AdminPersonnel), 14 commentaires (IA analyse), 15 alertes (alerteSilence + note ≤2), 16 actions (TacheCorrective), 17 suivi (historique + relanceTache), 18 rapports (RapportMensuelPrint + StatistiquesMensuelles), 19 historique (archivage sans suppression), 20 droits (RLS), 21 notifications (gateway), 22 traitements auto (jobs), 23 responsive.

**ÉCARTS à combler** (backlog priorisé) :

| Écart | Source CDC | État | Spec |
|---|---|---|---|
| **E1 — Refonte landing + identité UX (Mint × Poste CI)** | §42, §48 | Landing correcte mais générique | **Doc 10 — FAIT dans cette passe** |
| **E2 — Coordonnées recontact (email + téléphone optionnels)** | RG12 rev. | Seul `telephone` existe dans le payload | Doc 08 §2 — à implémenter (backend + CollectePage) |
| **E3 — RG17 : Direction sans verbatims** | Doc 08 | AvisPage exposée aux rôles sans filtre verbatim confirmé | Doc 08 §6 — audit RLS à faire puis endpoints Direction→agrégats |
| **E4 — k-anonymat ≥ 5 sur les agrégats par agent** | RG13 | Non trouvé dans queries.ts | Doc 08 §4 — backend |
| **E5 — QR : exports SVG/PDF + partage** (KitGuichet = PNG seulement) | §13, demande Ivo | PNG A4/A5/carte existant | Doc 09 — enrichir KitGuichet |
| **E6 — Canal USSD** | §13 | Aucune trace | Backlog v2 (dépend opérateur télécom) |
| **E7 — Journal d'accès Qualité (RG18)** | Doc 08 | Modèle Logs existe, écriture d'accès avis à vérifier | Doc 08 §6 |

**Règle** : chaque écart reçoit sa spec avant implémentation ; toute PR de feature cite son écart E#.

## 5. Définition de « fini »

1. Critères d'acceptation de la spec cochés par l'agent lui-même.
2. Checklist design-system (Doc 03-mint §checklist) passée.
3. `wasp build` (ou dev serveur) sans erreur nouvelle ; page vérifiée à 375px ET 1280px.
4. Décisions hors spec consignées au §3.
