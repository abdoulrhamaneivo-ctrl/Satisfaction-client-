# PATRON — Spec exécutable par page/feature

# {PROJET} — Spec {NOM PAGE/FEATURE}
## Doc {NN} — {titre une ligne}

<!-- Prérequis de lecture : renvoyer aux docs transversales (périmètre métier, design system). Mentionner la source officielle (cahier des charges §X) si elle existe. Feature dir : src/features/{domaine}/ -->

---

## 1. Objectif
{2-3 phrases maximum — QUOI et POURQUOI, pas COMMENT}

**Users stories :**
- En tant que {rôle}, je {action} pour {bénéfice}.

---

## 2. Données & API contractuelle
```
GET    /api/{ressource}/          → { shape }
POST   /api/{ressource}/          // body {...} → 201 | 403 | 409 ...
```
<!-- Règles dures numérotées (codes retour, quotas, garde-fous) -->
Clés query : ["..."]. Invalidation croisée : [...]

Types JSDoc : renvoyer au fichier central {shared/types/models.js}.

---

## 3. Structure fichiers à produire
```
src/features/{domaine}/
├── pages/{Page}.jsx
├── components/{Composant}.jsx   # un composant = une responsabilité visible du wireframe
├── hooks/use{Domaine}.js
├── rules.js                     # logique conditionnelle consommée par ≥2 composants
└── schemas.js                   # zod
```

---

## 4. Wireframe texte ASCII
<!-- Boîtes ═══ ║, zones NOMMÉES, TOUS les états visibles (loading/empty/error inclus) -->
╔══ SHELL ══╗
║ h1 ...    ║
╚═══════════╝

### Comportements clés
| Situation | Comportement |
|---|---|
| cas limite | ... |
| erreur API 409 | toast + état explicite |

---

## 5. Animations contractuelles
<!-- UNIQUEMENT des variants nommés partagés (fadeInUp, staggerContainer/staggerItem, pageTransition, hoverLift...) — jamais de variant inventé ad hoc -->
- Entrée page : pageTransition
- Listes : staggerContainer + staggerItem
- reduced-motion : fade simple 120ms

---

## 6. Accessibilité minimale
<!-- roles ARIA réels, labels formulaires, focus visible/trap, contrastes AA -->
1. ...

---

## 7. Critères d'acceptation
<!-- NUMÉROTÉS, VÉRIFIABLES par l'agent lui-même avant livraison ; inclure les règles RG concernées -->
1. Impossible de {comportement interdit} (UI masquée ET erreur API gérée).
2. Mobile 375px vérifié : ...
3. Checklist design-system passée (tous les points).

---

## 8. Frontières — ne PAS faire ici
<!-- Anti-scope-creep : renvoyer vers les specs qui possèdent ces responsabilités -->
- {Responsabilité X} → voir Doc {MM}
