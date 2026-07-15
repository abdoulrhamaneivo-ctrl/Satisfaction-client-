import { useEffect, useMemo, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { routes } from "wasp/client/router";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import { NavBar } from "./components/NavBar/NavBar";
import {
  demoNavigationitems,
  marketingNavigationItems,
} from "./components/NavBar/constants";
import { CookieConsentBanner } from "./components/cookie-consent/Banner";
import { AnimatePresence, motion } from "framer-motion";

export function App() {
  const location = useLocation();
  const isMarketingPage = useMemo(() => {
    return (
      location.pathname === routes.LandingPageRoute.to ||
      location.pathname === routes.PricingPageRoute.to
    );
  }, [location]);

  const navigationItems = isMarketingPage
    ? marketingNavigationItems
    : demoNavigationitems;

  const shouldDisplayAppNavBar = useMemo(() => {
    return (
      location.pathname !== routes.LoginRoute.build() &&
      location.pathname !== routes.SignupRoute.build()
    );
  }, [location]);

  // Les routes CXSAT /admin/personnel, /admin/tarifs et /admin/agences ne
  // sont pas le dashboard admin Wasp — elles ont besoin de la NavBar
  // normale. Bug corrigé : /admin/agences avait été oublié dans cette
  // liste, donc son chemin "/admin/agences" matchait startsWith("/admin")
  // et la page était traitée comme le dashboard admin intégré de Wasp
  // (rendu seul, sans NavBar ni barre de navigation d'aucune sorte).
  const CXSAT_ADMIN_ROUTES = ['/admin/personnel', '/admin/tarifs', '/admin/agences'];
  const isAdminDashboard = useMemo(() => {
    return (
      location.pathname.startsWith(routes.AdminRoute.to) &&
      !CXSAT_ADMIN_ROUTES.some((r) => location.pathname.startsWith(r))
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
    } else if (location.pathname === "/") {
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [location]);

  return (
    <>
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
                  <NavBar navigationItems={navigationItems} />
                )}
                <div className="max-w-(--breakpoint-2xl) mx-auto">
                  <Outlet />
                </div>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <Toaster position="bottom-right" />
      <CookieConsentBanner />
    </>
  );
}
