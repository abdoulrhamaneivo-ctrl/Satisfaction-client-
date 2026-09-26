type FormValues = Record<string, any>;
interface UseFormPersistenceOptions {
    /** Clé unique localStorage (ex: 'create-company', 'edit-company-42') */
    key: string;
    /** Valeurs initiales (pour reset / 1er chargement) */
    initialValues: FormValues;
    /** Délai débounce avant sauvegarde (ms) */
    debounceMs?: number;
    /** Activer/désactiver la persistance */
    enabled?: boolean;
}
interface UseFormPersistenceReturn {
    /** Fonction à appeler quand les valeurs changent (ex: onChange wrapper) */
    persist: (values: FormValues) => void;
    /** Récupère les valeurs persistées ou initialValues */
    getPersistedValues: () => FormValues;
    /** Efface la persistance (appeler après submit réussi) */
    clear: () => void;
    /** Réinitialise aux valeurs initiales + efface persistance */
    reset: () => void;
}
export declare function useFormPersistence({ key, initialValues, debounceMs, enabled, }: UseFormPersistenceOptions): UseFormPersistenceReturn;
export {};
//# sourceMappingURL=useFormPersistence.d.ts.map