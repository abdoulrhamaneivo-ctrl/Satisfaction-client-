import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { routes } from "wasp/client/router";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import { Sidebar, MobileSidebarDrawer } from "./components/Sidebar";
import { MobileAppHeader } from "./components/MobileAppHeader";
import { OnboardingTour } from "./components/OnboardingTour";
import { BrandProvider } from "./context/BrandContext";
import { CommandPalette } from "./components/CommandPalette";

export function App() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const shouldDisplayAppNavBar = useMemo(() => {
    // Le questionnaire QR est une expérience publique et autonome
    const standaloneRoutes = [
      routes.LoginRoute.to,
      '/apres-connexion',
      '/request-password-reset',
      '/password-reset',
      '/email-verification',
    ];
    return !standaloneRoutes.includes(location.pathname) && !location.pathname.startsWith('/q/');
  }, [location]);

  // PERFORMANCE QR (fix « clics/saisie lents ») : sur /q/*, on ne monte NI les
  // blobs décoratifs (même statiques, 4 x blur-3xl plein écran coûtent une
  // recomposition GPU à chaque re-render du formulaire pendant la frappe),
  // NI le shell dashboard. La page de collecte est rendue nue : HTML + CSS
  // léger + React + 1 requête API.
  const isQRCollecte = location.pathname.startsWith('/q/');
  const showGlobalBlobs = !isQRCollecte;

  const YEBA_ADMIN_ROUTES = ['/admin/personnel', '/admin/agences'];
  const isAdminDashboard = useMemo(() => {
    // Route /admin du template Wasp retirée (audit P2 — dashboard isAdmin
    // supprimé). On garde le test de préfixe pour l'ancien lien éventuel.
    return (
      location.pathname.startsWith('/admin') &&
      !location.pathname.startsWith('/platform') &&
      !YEBA_ADMIN_ROUTES.some((r) => location.pathname.startsWith(r))
    );
  }, [location]);

  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <BrandProvider>
      <div className="relative min-h-screen bg-app-shell text-foreground selection:bg-primary/20 selection:text-primary">
        {/* Blobs décoratifs — UNIQUEMENT hors parcours QR (voir commentaire
            PERFORMANCE QR ci-dessus : même statiques, ils sont recomposés par
            le GPU à chaque frappe sur un téléphone d'agence). */}
        {showGlobalBlobs && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute top-[-12%] left-[-8%] size-[38rem] rounded-full bg-brand-green/8 blur-3xl" />
            <div className="absolute top-[10%] right-[-10%] size-[30rem] rounded-full bg-warning/8 blur-3xl" />
            <div className="absolute bottom-[-14%] left-[12%] size-[34rem] rounded-full bg-brand-green-deep/6 blur-3xl" />
            <div className="absolute top-[42%] left-[36%] size-[24rem] rounded-full bg-warning/5 blur-3xl" />
          </div>
        )}
        <div className="relative">

        {isAdminDashboard ? (
          <Outlet />
        ) : shouldDisplayAppNavBar ? (
          <div className="min-h-screen relative">
            <OnboardingTour />
            {/* Sidebar Sleek Notion/Linear 100% fixe sur Desktop */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Contenu principal décalé avec lg:pl-64 pour s'aligner sur la Sidebar fixe */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-64">
              <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
                <MobileAppHeader menuOpen={mobileNavOpen} onMenuOpen={() => setMobileNavOpen(true)} />
              </div>
              <MobileSidebarDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
              <CommandPalette />

              <main id="contenu-principal" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto pt-20 lg:pt-8">
                <Outlet />
              </main>
            </div>
          </div>
        ) : (
          <main id="contenu-principal" tabIndex={-1}>
            <Outlet />
          </main>
        )}
        </div>
      </div>
      <Toaster position="bottom-right" />
    </BrandProvider>
  );
}
