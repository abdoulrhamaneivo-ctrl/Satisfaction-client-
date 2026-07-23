import { useEffect, useMemo, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { routes } from "wasp/client/router";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import { NavBar } from "./components/NavBar/NavBar";
import { demoNavigationitems } from "./components/NavBar/constants";
import { AnimatePresence, motion } from "framer-motion";
import { BrandProvider } from "./context/BrandContext";
import { CommandPalette } from "./components/CommandPalette";

export function App() {
  const location = useLocation();
  const navigationItems = demoNavigationitems;

  const shouldDisplayAppNavBar = useMemo(() => {
    // Le questionnaire QR est une expérience publique et autonome : la
    // navigation métier (dashboard, personnel, alertes…) n'a rien à y faire.
    // Les écrans d'authentification gardent également leur propre habillage.
    const standaloneRoutes = [
      routes.LandingPageRoute.to,
      routes.LoginRoute.to,
      '/apres-connexion',
      '/request-password-reset',
      '/password-reset',
      '/email-verification',
    ];
    return !standaloneRoutes.includes(location.pathname) && !location.pathname.startsWith('/q/');
  }, [location]);

  // Les routes Yeba /admin/personnel et /admin/agences ne sont pas le
  // dashboard admin Wasp — elles ont besoin de la NavBar normale. Bug
  // corrigé : /admin/agences avait été oublié dans cette liste, donc son
  // chemin "/admin/agences" matchait startsWith("/admin") et la page était
  // traitée comme le dashboard admin intégré de Wasp (rendu seul, sans
  // NavBar ni barre de navigation d'aucune sorte).
  const YEBA_ADMIN_ROUTES = ['/admin/personnel', '/admin/agences'];
  const isAdminDashboard = useMemo(() => {
    return (
      location.pathname.startsWith(routes.AdminRoute.to) &&
      !YEBA_ADMIN_ROUTES.some((r) => location.pathname.startsWith(r))
    );
  }, [location]);

  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);

      if (element) {
        // Scroll immediately, then keep watching for size changes
        // (e.g. async content loading) and re-scroll into view.
        element.scrollIntoView({ behavior: "smooth" });
        resizeObserverRef.current = new ResizeObserver(() => {
          element.scrollIntoView({ behavior: "smooth" });
        });
        resizeObserverRef.current.observe(element);
      }
    } else {
      // Correctif : ce reset ne s'appliquait qu'à la landing page ("/").
      // Sur toutes les autres routes, React Router ne réinitialise PAS le
      // défilement lors d'une navigation interne (ce n'est pas un rechargement
      // de page) : en arrivant sur "Tableau de bord" ou "Planning" après avoir
      // scrollé une page précédente, la nouvelle page s'affichait déjà
      // scrollée à la même position — son titre se retrouvait à moitié
      // caché sous la barre de navigation "sticky", et l'utilisateur avait
      // l'impression d'atterrir "au milieu de nulle part". On remonte donc
      // en haut à CHAQUE changement de page (sans hash), pas seulement sur
      // la landing page.
      if (window.scrollY > 0) {
        window.scrollTo(0, 0);
      }
    }

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [location]);

  return (
    <BrandProvider>
      {/* Bug corrigé : le <motion.div> n'avait pas de `key` liée à la route,
          donc AnimatePresence ne détectait jamais un changement de page —
          combiné à mode="wait" (qui attend la fin de la sortie AVANT de
          démarrer l'entrée) et une durée de 0.3s de chaque côté, certaines
          navigations pouvaient sembler figées/lentes. On ajoute la clé,
          on raccourcit la transition et on retire "wait" pour un fondu
          croisé quasi instantané, beaucoup plus fluide au clic. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="bg-background text-foreground min-h-screen">
            {isAdminDashboard ? (
              <Outlet />
            ) : (
              <>
                {shouldDisplayAppNavBar && (
                  <>
                    <NavBar navigationItems={navigationItems} />
                    <CommandPalette />
                  </>
                )}
                {shouldDisplayAppNavBar && (
                  <a
                    href="#contenu-principal"
                    className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg focus:not-sr-only"
                  >
                    Aller au contenu principal
                  </a>
                )}
                <main id="contenu-principal" tabIndex={-1} className="max-w-(--breakpoint-2xl) mx-auto">
                  <Outlet />
                </main>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <Toaster position="bottom-right" />
    </BrandProvider>
  );
}
