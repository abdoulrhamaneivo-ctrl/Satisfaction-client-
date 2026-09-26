import React from 'react';
/** Mocks react-router / react-router-dom : la page DOIT les déclarer. */
export declare const routerMock: () => {
    useParams: () => {
        id: string;
        code: string;
    };
    useLocation: () => {
        pathname: string;
        search: string;
        hash: string;
    };
    useNavigate: () => () => undefined;
    useSearchParams: () => (URLSearchParams | (() => undefined))[];
    Navigate: ({ to }: any) => React.JSX.Element;
    Link: ({ children, ...props }: any) => React.JSX.Element;
    NavLink: ({ children, ...props }: any) => React.JSX.Element;
    routes: {
        LoginRoute: {
            to: string;
        };
        AccountRoute: {
            to: string;
        };
    };
};
/**
 * Mocks framer-motion : le test porte sur le DOM, pas sur les animations.
 * Sans ce mock, le `requestAnimationFrame` de jsdom rend les dates de
 * montage non déterministes sous horloge simulée.
 */
export declare const motionMock: () => {
    motion: object;
    AnimatePresence: ({ children }: any) => any;
    useReducedMotion: () => boolean;
    LayoutGroup: ({ children }: any) => any;
    MotionConfig: ({ children }: any) => any;
};
/** Mock de la charte : la page auditée n'a pas besoin du vrai contexte. */
export declare const brandMock: () => {
    useBrand: () => {
        brandConfig: {};
        loading: boolean;
        isCustom: boolean;
    };
};
/**
 * Utilisateur authentifié.
 *
 * Obligatoire : `RequireAuth` redirige vers /login tant que
 * `useAuth().data` est undefined. Sans utilisateur, la page auditée n'est
 * jamais montée et le test auditerait la page de connexion — c'est-à-dire
 * passerait à vide.
 */
export declare const authMock: (user?: Record<string, unknown>) => {
    useAuth: () => {
        isLoading: boolean;
        data: {
            id: number;
            email: string;
            role: string;
            id_agence: number;
            id_entreprise: number;
            actif: boolean;
        };
    };
};
/**
 * Exécute axe-core et échoue avec un message lisible.
 *
 * Le message nomme la règle, son impact et les éléments concernés : un
 * « 1 violation » sans détail ne permet pas de corriger quoi que ce soit.
 */
export declare function auditerPage(libelle: string, racine?: HTMLElement | Document): Promise<void>;
//# sourceMappingURL=harnaisA11y.d.ts.map