# Identité visuelle Yéba

La charte visuelle est fixe et définie dans `src/shared/branding.ts`. `BrandContext` l’injecte au client ; le formulaire QR et le tableau de bord utilisent le même thème.

Yeba accompagne une entreprise cliente avec plusieurs agences possibles. La marque n’est toutefois pas personnalisable par agence ou par entreprise. Le modèle `BrandingConfig`, son interface et ses opérations sont retirés ; la migration correspondante supprime les anciennes valeurs stockées.

Pour faire évoluer la charte, modifier les valeurs contrôlées de `BRANDING`, vérifier le contraste et reconstruire le projet. Les styles du kit QR restent eux aussi définis dans le code.
