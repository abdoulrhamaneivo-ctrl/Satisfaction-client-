# YEBA PLATFORM — Branding Studio & QR Designer
## Doc 13 — Personnalisation par entreprise (logo, charte, messages, QR)

> **Prérequis** : Doc 11 (tenant, `platformRole`), Doc 12 (console).
> **Principe sécurité** : l'entreprise personnalise des **valeurs contrôlées** (couleurs HEX validées, textes bornés, fichiers validés) — **jamais de CSS libre, jamais de HTML/JS injecté**. Le design system Yeba reste la seule source de structure.
> **Socle technique existant** : `src/shared/branding.ts` (BRANDING figé) + `BrandContext`/`useBrand()` (injecte les tokens CSS à l'exécution) + upload S3 (`src/file-upload/`).

---

## 1. Deux identités séparées (ne jamais fusionner)

| | Identité **entreprise** | Identité **QR / expérience client** |
|---|---|---|
| S'applique à | Dashboard, avis, agences, guichets, paramètres | Page `/q/:guichetId` + affiche QR imprimée |
| Portée | Toute l'entreprise | Globale entreprise, **surchargeable par guichet** |
| Écran | Paramètres → Branding | Paramètres → QR Codes (+ KitGuichet par guichet) |
| Édition | DIRECTION (QUALITE lecture) | DIRECTION / CHEF_AGENCE |

Exemple : La Poste CI (logo `laposte.png`, vert `#008A55`, jaune `#FFCC00`) peut donner au QR du **Guichet Courrier** un titre « Votre avis sur le service courrier » différent du message global.

## 2. Modèle de données

```prisma
model BrandingConfig {
  id             BigInt  @id @default(autoincrement())
  id_entreprise  Int     @unique
  entreprise     Entreprise @relation(fields: [id_entreprise], references: [id], onDelete: Cascade)

  // ── Identité ──
  logo_url       String?    // S3, validé (voir §6)
  logo_light_url String?    // variante pour fonds sombres (footer noir Mint)
  favicon_url    String?
  nom_affiche    String?    // remplace nom_entreprise dans l'UI si défini

  // ── Couleurs (HSL "H S% L%" comme branding.ts, ou HEX converti serveur) ──
  color_primary   String?   // null = hérite du thème Yeba par défaut
  color_secondary String?
  color_accent    String?
  color_background String?

  // ── Messages expérience client (longueur max stricte) ──
  form_title      String?  @db.VarChar(120)
  form_subtitle   String?  @db.VarChar(200)
  form_thank_you  String?  @db.VarChar(120)
  qr_slogan       String?  @db.VarChar(80)

  // ── QR (surcharge par guichet dans GuichetQrStyle) ──
  qr_style        String   @default("CLASSIQUE")  // CLASSIQUE | MODERNE | PREMIUM
  qr_color        String?
  qr_bg_color     String?
  qr_frame        String   @default("SIMPLE")     // AUCUN | SIMPLE | PREMIUM

  // ── Plan gating (Doc 11 §4) ──
  // Les champs ci-dessus ne sont WRITABLES que si le plan l'autorise ;
  // la vérification est côté serveur (voir §5).

  updated_by      String?
  updated_at      DateTime @updatedAt
  created_at      DateTime @default(now())
}

model GuichetQrStyle {
  id           BigInt  @id @default(autoincrement())
  id_guichet   BigInt  @unique
  guichet      Guichet @relation(fields: [id_guichet], references: [id], onDelete: Cascade)
  form_title   String? @db.VarChar(120)   // surcharge locale
  form_subtitle String? @db.VarChar(200)
  qr_slogan    String? @db.VarChar(80)
}
```

**Résolution à l'affichage** (fonction unique, testée) :
```
valeur effective = guichet.qrStyle?.champ ?? entreprise.branding?.champ ?? BRANDING.champ
```
Fallback en cascade — aucune page ne casse si le branding est incomplet.

## 3. Ce que l'entreprise peut personnaliser (par plan)

| | STARTER | BUSINESS | ENTERPRISE |
|---|---|---|---|
| Logo (+light) | ✅ | ✅ | ✅ |
| Couleur primaire | ✅ | ✅ | ✅ |
| Charte complète (secondaire, accent, fond) | — | ✅ | ✅ |
| Messages (titre, sous-titre, remerciement, slogan) | ✅ | ✅ | ✅ |
| QR Designer (style, couleurs, cadre) | — | ✅ | ✅ |
| Modèles QR avancés + SVG/PDF | — | — | ✅ |
| Surcharge par guichet | — | ✅ | ✅ |
| Suppression « Propulsé par Yeba » | — | — | ✅ (`hide_yeba_branding`) |

## 4. Écran « Paramètres → Branding » (espace entreprise)

Layout **deux colonnes** : gauche = formulaire par sections, droite = **aperçu live** (sticky).

```
┌─────────────────────────┬───────────────────────────┐
│ IDENTITÉ                │        APERÇU             │
│ Logo      [Télécharger] │  ┌─────────────────────┐  │
│ Logo clair [Télécharger]│  │  [logo entreprise]   │  │
│ Nom affiché [La Poste CI]│  │  Votre avis compte ! │  │
│                         │  │  Notez-nous en 10 s… │  │
│ COULEURS (per plan)     │  │  [ 😡 😟 😐 🙂 🤩 ]  │  │
│ Primaire   [#008A55] 🎨 │  │  Merci pour votre    │  │
│ Secondaire [#FFCC00] 🎨 │  │  avis !              │  │
│ Accent     [#E6F4EC] 🎨 │  └─────────────────────┘  │
│                         │  ┌─────────────────────┐  │
│ MESSAGES                │  │  APERÇU AFFICHE QR   │  │
│ Titre    [Votre avis…]  │  │  (fond = qr_bg,      │  │
│ Sous-titre [Notez-nous…]│  │   slogan + cadre)    │  │
│ Remerciement [Merci…]   │  └─────────────────────┘  │
│ Slogan QR  [Scannez…]   │                           │
│                         │                           │
│        [ Enregistrer ]  │                           │
└─────────────────────────┴───────────────────────────┘
```

**Aperçu live** :
- Re-render **local** (state React) — **zéro requête serveur** à chaque frappe/couleur.
- Les champs de couleur : `<input type="color">` + champ HEX synchronisé.
- L'aperçu reproduit la carte CollectePage en miniature (composant partagé `CollectePreview` qui lit les mêmes props) — ce que l'aperçu montre EST ce que le client verra.

**Enregistrement** : action `updateBranding({ ...champs })` :
- `requireRole(['DIRECTION'])` + `assertPlanAllows('branding.complet')` si champ avancé ;
- validation zod par champ (regex HEX `^#[0-9a-fA-F]{6}$`, longueurs max, URL S3 pré-signée requise pour logos) ;
- AuditLog `branding.update` (diff avant/après).

## 5. Sécurité de la personnalisation (non négociable)

1. **Pas de CSS/HTML libre** : l'entreprise envoie des valeurs (HEX, textes courts, id de fichier S3) — le front injecte `--brand-primary: <valeur validée>` via BrandContext. Aucun champ `custom_css`.
2. **Injection interdite par construction** : textes rendus par React (échappement natif), jamais en `dangerouslySetInnerHTML`. Un message contenant `<script>` s'affichera comme du texte inoffensif.
3. **Contraste mesuré** : à l'enregistrement, le serveur calcule le ratio de contraste (formule WCAG) de `color_primary` sur blanc ; si < 3:1 → avertissement bloquant « Cette couleur rendra les boutons illisibles ». Même logique que la Doc 04.
4. **Upload de logo** (S3 pré-signé, réutilise `src/file-upload/`) :
   - types autorisés : PNG, SVG, WebP (allowlist MIME + vérification du **vrai** MIME côté serveur, pas l'extension) ;
   - taille max 2 Mo ; dimensions max 1024×512 ;
   - nom de fichier **généré serveur** (`branding/{id_entreprise}/logo-{uuid}.png`) — jamais le nom fourni ;
   - SVG : uniquement servis avec `Content-Type: image/svg+xml` et sans scripts (strip `<script>` au stockage ou conversion PNG) ;
   - URL rendue en `<img src>` (jamais inline dans le DOM).
5. **Gating par plan côté serveur** : `assertPlanAllows(feature)` vérifie le plan en base ; un patch front ne permet pas d'écrire un champ BUSINESS avec un compte STARTER.
6. **Super Admin** : lecture du branding OK (support), écriture NON (sauf `desactiverBranding` sur litige, journalisée — Doc 11 §7).

## 6. Écran « Paramètres → QR Codes »

Liste des guichets avec leur QR personnalisé :

```
QR CODES — tous vos QR codes            [+ Générer un QR]
┌──────────────────────────────┬──────────────────────────────┐
│ Agence Plateau · Guichet 1   │ Agence Cocody · Accueil      │
│ [aperçu affiche]             │ [aperçu affiche]             │
│ PNG · PDF                    │ PNG · PDF · SVG (Enterprise) │
│ Modifier le message →        │ Modifier le message →        │
└──────────────────────────────┴──────────────────────────────┘
```

### QR Designer (modale ou page)
- **Style** : CLASSIQUE (coins nets) / MODERNE (coins arrondis, points ronds) / PREMIUM (cadre avec nom d'entreprise + slogan sous le QR).
- **Couleurs** : `qr_color` (modules) + `qr_bg_color` (fond) avec color-picker ; garde-fou **contraste ≥ 40 %** de luminance différente sinon warning « QR difficile à scanner ».
- **Logo centré** : optionnel (le logo entreprise, taille ≤ 20 % de la surface — au-delà, warning).
- **Message sous le QR** (affiche imprimée) : `qr_slogan`.
- **Cadre** : AUCUN / SIMPLE (liseré vert) / PREMIUM (bandeau nom entreprise + slogan).
- **Contenu technique intouchable** : le QR encode **toujours** l'URL canonique `https://<domaine>/q/<id_guichet>` (ou un code opaque `8F7K2M` résolu côté serveur — recommandé, cf. §8). Le branding décore **autour** du QR, jamais dans sa logique.
- Génération : la lib `qrcode` (déjà utilisée par le KitGuichet) accepte couleur modules/fond et marge ; l'ajout logo au centre se fait par composition canvas au téléchargement PNG/PDF (le QR restant scannable : zone de silence respectée).

## 7. Expérience client finale (ce que voit le client qui scanne)

```
┌──────────────────────────────┐
│      [LOGO ENTREPRISE]       │  ← BrandingConfig.logo_url
│    Votre avis sur le service │  ← GuichetQrStyle.form_title ?? entreprise
│    courrier                  │
│                              │
│  Notez-nous en 10 secondes   │  ← form_subtitle
│       😡 😟 😐 🙂 🤩        │  ← couleur primaire appliquée aux actifs
│                              │
│   [Donnez-nous votre avis]   │  ← qr_slogan (footer)
│ Propulsé par Yeba (ou masqué)│  ← hide_yeba_branding (Enterprise)
└──────────────────────────────┘
```

Techniquement : `CollectePage` charge déjà `getFormDefinitionForGuichet` (qui inclut `brandConfig: BRANDING`). Évolution : cette query renvoie la **config résolue** (cascade §2) en un seul objet — **zéro requête supplémentaire** sur le chemin critique performance (Doc 00 §4).

## 8. QR opaque — recommandation sécurité

Aujourd'hui le QR encode `/q/<id_guichet>` (entier prédictible). Pour le SaaS :
- Nouveau champ `Guichet.code_public` (ex. `crypto.randomBytes(4).toString('base64url')` → 6-8 chars, unique) généré à la création ;
- Route collecte accepte `/q/<code_public>` (le serveur résout le guichet) ;
- Les anciens QR numériques restent valides (compatibilité) mais les nouveaux exports utilisent le code opaque ;
- Empêche l'énumération de guichets d'autres tenants par simple incrément d'URL — complémentaire à la RLS (le guichet reste filtré par agence/entreprise active à l'affichage du formulaire).

## 9. Migration de l'existant (BrandContext)

1. `BrandContext` conserve son API (`useBrand()` → `{ brandConfig, isLoading }`) — **aucun composant à modifier**.
2. La source change : `BrandProvider` charge `getMonBranding` (query auth pour l'app connectée) ou reçoit la config résolue via `getFormDefinitionForGuichet` (page QR — déjà le cas).
3. `src/shared/branding.ts` reste la **valeur par défaut** (fallback cascade) et la référence des tokens.
4. Étape 1 : brander l'aperçu et l'enregistrement. Étape 2 : brancher la résolution. Étape 3 : gating par plan.

## 10. Checklist d'acceptation

1. Changer la couleur primaire dans Branding Studio → l'aperçu live change instantanément, sans requête ; après enregistrement, le dashboard ET la page QR utilisent la nouvelle couleur.
2. Un message contenant `<script>alert(1)</script>` s'affiche tel quel, sans exécution.
3. Couleur primaire `#777777` → enregistrement refusé (contraste insuffisant).
4. Un compte STARTER tente d'écrire `qr_style` via l'API → **403 plan**.
5. Un logo de 5 Mo / `evil.svg` contenant un script → rejet serveur.
6. QR généré : scannable par un scanner standard (test sur 3 appareils), zone de silence respectée, logo centré ≤ 20 %.
7. Le chemin critique `/q/*` ne charge **aucune** requête supplémentaire à cause du branding (config résolue incluse dans la query existante).
8. Entreprise sans branding du tout → formulaire identique à aujourd'hui (fallback BRANDING).
