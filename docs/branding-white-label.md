# Identité visuelle Yeba (marque figée)

> Historique : ce document décrivait auparavant un système de personnalisation
> visuelle "white-label" multi-tenant (modèle `BrandConfig` en base, page
> d'administration `/admin/marque`, action `upsertBrandConfig`). Ce module a
> été **entièrement supprimé** lors de la conversion de Yeba en outil interne
> mono-agence : il n'y a plus qu'une seule entreprise, donc plus besoin d'une
> charte graphique configurable par tenant.

## État actuel

L'identité visuelle (nom de la plateforme, logo, couleurs HSL, police,
textes du formulaire de collecte, style des ombres/bordures) est désormais
**figée en dur dans le code**, dans une seule constante :

```
src/shared/branding.ts   →  export const BRANDING = { ... }
```

- `src/client/context/BrandContext.tsx` injecte ces valeurs comme variables
  CSS (`:root`) au chargement de l'application — aucune lecture en base,
  aucun appel réseau.
- `src/client/components/BrandLogo.tsx` affiche `BRANDING.logo_url` s'il est
  renseigné, sinon un logo Yeba par défaut (`YebaLogo`).
- `getFormDefinitionForGuichet` (formulaire public de collecte, `/q/:id`)
  renvoie aussi `brandConfig: BRANDING` pour rester cohérent avec le reste de
  l'application.

## Comment changer la charte graphique

Il n'y a plus d'écran d'administration : modifier directement les valeurs
dans `src/shared/branding.ts` (nom, couleurs au format HSL `"H S% L%"`,
logo, textes du formulaire, etc.), puis redéployer.
