# YEBA — Spec Refonte Landing (E1)
## Doc 10 — LandingPage × langage Mint × charte Poste CI

> **Prérequis** : Doc 03 (grammaire Mint), Doc 04 (charte), Doc 00 (écart E1).
> **Fichier** : `src/client/pages/LandingPage.tsx` (réécriture) + `src/client/components/BandeauInstitutionnel.tsx` (nouveau) + ajouts CSS `Main.css` (.btn-mint*, .lisere-tricolore).
> **Base conservée** : hero-carousel photos, Counter animé, vidéo yeba-howto.mp4, structure 5 sections, auth-aware CTA, useBrand.

## 1. Objectif

Transformer la landing générique en vitrine institutionnelle à l'identité Mint × Poste CI : navigation à deux états, typographie d'impact, cartes structurées numérotées, boutons à bordure inversée, footer noir « BACK TO TOP ». Toute l'existant fonctionnel (carousel, compteurs, vidéo, CTA auth) est CONSERVÉ.

## 2. Structure cible (5 sections + header + footer)

1. **Header fixe** : blanc OPAQUE (plus de backdrop-blur), deux états (scroll), logo YebaLogo 40→32, liens UPPERCASE hover jaune (Le produit / Comment ça marche / Pensé pour vos équipes / Contact→CTA), CTA auth à droite (`.btn-mint-vert` compact).
2. **Héros** : carousel photos EXISTANT + voile vert profond existant ; eyebrow chip (dot jaune) ; H1 `text-4xl→6xl weight800` ; CTA principal `.btn-mint` (jaune) + 3 points de réassurance (puce jaune).
3. **Comment ça marche** : 3 cartes numérotées (grand chiffre watermark 5xl/15%), icônes alternées vert/jaune, hover lift Mint ; vidéo démo conservée sous les cartes avec liseré tricolore en pied de cadre.
4. **Pensé pour vos équipes** : 3 cartes idem + bande de chiffres (Counter existant) avec top-liseré alterné.
5. **CTA final** : panneau vert dégradé existant + `.btn-mint` inversé (fond jaune, texte noir) ; mention confidentialité RG17 en une ligne (« Les avis restent suivis au niveau des agences — la direction pilote par les chiffres »).
6. **Footer NOIR Mint** : logo + © + « BACK TO TOP » hover jaune + liens (Espace équipe, Avis confidentiels, ARTCI) + bandeau institutionnel + liseré tricolore final.

## 3. Comportements clés

| Situation | Comportement |
|---|---|
| Scroll > 80px | Header compacte (py, logo), ombre douce |
| Clique lien header | scrollIntoView smooth de la section (#produit, #fonctionnement, #equipes, #contact) |
| CTA principal (connecté/non) | /dashboard ou /login (logique existante useAuth conservée) |
| reduced-motion | carousel figé 1re image, blobs off, reveals en fade simple |
| Mobile 375px | H1 4xl, cartes en pile, header avec burger → drawer noir |

## 4. Critères d'acceptation

1. Aucun backdrop-blur sur header/cartes (fond opaque) — grep `backdrop-blur` = 0 dans LandingPage.
2. Liens nav UPPERCASE hover jaune ; boutons CTA `.btn-mint` avec inversion au survol.
3. Footer noir avec BACK TO TOP fonctionnel + bandeau institutionnel + liseré tricolore.
4. Numéros watermark sur les cartes ; alternance vert/jaune des icônes ; hover lift.
5. Fonctionnalités existantes intactes : Counter, vidéo, carousel, auth-aware, useBrand.
6. 375px : pas de débordement horizontal ; 1280px : max-w-6xl centré.
7. `wasp build` sans erreur ; a11y : nav aria-label, contrastes (jaune uniquement en accent/grands titres sur fond sombre).

## 5. Frontières — ne PAS faire ici

- La CollectePage (formulaire scan) → garde son design actuel, refonte séparée (E2/E3).
- Les pages connectées → phase suivante (E3-RG17 : audit AvisPage/RLS d'abord).
- Le palette Main.css → inchangée (décision 00-INDEX §3).
