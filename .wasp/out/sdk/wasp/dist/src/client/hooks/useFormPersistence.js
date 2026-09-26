// src/client/hooks/useFormPersistence.ts
// Hook de persistance formulaire (localStorage) — C5/UX
// Sauvegarde débouncée au changement, restauration au mount, nettoyage après submit réussi.
import { useEffect, useRef, useCallback } from 'react';
export function useFormPersistence({ key, initialValues, debounceMs = 500, enabled = true, }) {
    const storageKey = `form-persist:${key}`;
    const debounceRef = useRef(null);
    const initialRef = useRef(initialValues);
    const restoredRef = useRef(false);
    // Mise à jour initialValues si changées (ex: passage edit → create)
    useEffect(() => {
        initialRef.current = initialValues;
    }, [initialValues]);
    // Restauration au premier mount
    useEffect(() => {
        if (!enabled || restoredRef.current)
            return;
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge : initialValues en base, stored par-dessus (garde valeurs saisies)
                Object.assign(initialRef.current, parsed);
            }
        }
        catch {
            // localStorage corrompu ou quota dépassé → on ignore
        }
        finally {
            restoredRef.current = true;
        }
    }, [enabled, storageKey]);
    // Sauvegarde débouncée
    const persist = useCallback((values) => {
        if (!enabled)
            return;
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(values));
            }
            catch {
                // Quota dépassé → on nettoie l'ancien pour faire de la place
                localStorage.removeItem(storageKey);
            }
        }, debounceMs);
    }, [enabled, storageKey, debounceMs]);
    const getPersistedValues = useCallback(() => {
        if (!enabled)
            return initialRef.current;
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                return { ...initialRef.current, ...JSON.parse(stored) };
            }
        }
        catch {
            // ignore
        }
        return initialRef.current;
    }, [enabled, storageKey]);
    const clear = useCallback(() => {
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        localStorage.removeItem(storageKey);
        restoredRef.current = false;
    }, [storageKey]);
    const reset = useCallback(() => {
        clear();
        // Restore initialValues in next render
        initialRef.current = initialValues;
        restoredRef.current = false;
    }, [clear, initialValues]);
    return { persist, getPersistedValues, clear, reset };
}
//# sourceMappingURL=useFormPersistence.js.map