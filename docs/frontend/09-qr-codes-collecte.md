# YEBA — QR Codes de collecte : génération, export multi-formats, partage
## Doc 09 — Outil guichet `/outils/qr/:code` (demande Ivo 2026-08-29)

> **Prérequis** : Doc 06 (route de collecte cible), Doc 04 (charte pour les affiches PDF).
> **Source** : §13 du cahier des charges — « Le principal canal peut être un QR Code placé au niveau du guichet ».
> **Demande Ivo** : les QR générés doivent être **téléchargeables en plusieurs formats** et **partageables**.

---

## 1. Objectif

Fournir aux responsables un outil simple : entrer (ou arriver par) un code guichet → prévisualiser le QR de collecte → **télécharger en PNG / SVG / PDF** → **partager** (feuille de partage native mobile ou copie du lien). Chaque QR encode l'URL de collecte du guichet : `${origin}/avis/${guichetCode}`.

---

## 2. Contrats techniques

- Génération : `qrcode` (niveau de correction **H** — lisible même si 30 % de la surface est masquée : reflet, pli, éclat). Utilitaire : `src/lib/qr.js`.
- **PNG** : 1024 px par défaut (option 512/2048), fond blanc, marge 3 modules.
- **SVG** : vectoriel — pour l'imprimeur, redimensionnable sans perte.
- **PDF** : `jspdf`, **affiche A4 prête à plastifier** — bandeau vert « Votre avis compte », QR centré 120 mm, guichet + agence, encadré confidentialité (« Votre avis reste confidentiel », loi 2013-450 ARTCI), liseré tricolore en pied.
- **Partage** : Web Share API avec fichier (via `navigator.canShare({files})`) → repli lien → repli téléchargement PNG + bouton « Copier le lien » (presse-papier, fallback `execCommand`).
- Route : `/outils/qr/:code` (MinimalShell — sans navigation sortante vers l'app connectée). Le guichet est vérifié avant rendu ; 404 → état dédié.

---

## 3. Comportements clés

| Situation | Comportement |
|---|---|
| Chargement | Prévisualisation PNG 512 px + lien affiché sous le QR |
| Export PNG/SVG/PDF | Bouton en état « Génération… », téléchargement direct |
| Partage mobile | Feuille système (fichier PNG si supporté, sinon lien) |
| Partage desktop (pas d'API) | PNG téléchargé + message explicite |
| Copie lien | « Lien copié » 2 s, puis retour normal |
| Guichet inconnu (404) | État d'erreur dédié + retry |

---

## 4. Critères d'acceptation

1. Les 3 exports produisent des fichiers exploitables (PNG lisible au scan à 1-2 m ; SVG ouvrable par un imprimeur ; PDF A4 complet).
2. Le QR encode exactement `/avis/:code` (testé : `tests/qr.test.js`).
3. Niveau de correction H vérifiable (30 % d'occultation tolérée).
4. Partage : aucun plantage si l'API est absente (repli téléchargement).
5. Checklist design Doc 03 §7 : tokens, panneaux opaques, zéro emoji, liseré tricolore présent.

## 5. Frontières

- La gestion/le CRUD des guichets (créer, nommer, activer) → F3 (docs 08+). Ici : un outil par code guichet connu.
- La génération côté serveur / batch d'affiches pour toutes les agences → backend, F4.
- Le contenu de la page de collecte → Doc 06.
