// Alphabet QR public (sans 0/O/1/I) — 10 caractères, cf. genererCodePublic().
const CODE_PUBLIC_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;
export function parseCollecteIdentifier(identifiant) {
    const code = identifiant.trim().toUpperCase();
    if (!CODE_PUBLIC_PATTERN.test(code)) {
        return null;
    }
    return { kind: 'publicCode', code };
}
//# sourceMappingURL=routeParams.js.map