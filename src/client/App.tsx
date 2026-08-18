import { useEffect, useMemo, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { routes } from "wasp/client/router";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import { NavBar } from "./components/NavBar/NavBar";
import { Sidebar } from "./components/Sidebar";
import { OnboardingTour } from "./components/OnboardingTour";
import { demoNavigationitems } from "./components/NavBar/constants";
import { BrandProvider } from "./context/BrandContext";
import { CommandPalette } from "./components/CommandPalette";

export function App() {
  const location = useLocation();
  const navigationItems = demoNavigationitems;

  const shouldDisplayAppNavBar = useMemo(() => {
    // Le questionnaire QR est une expérience publique et autonome
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
        element.scrollIntoView({ behavior: "smooth" });
        resizeObserverRef.current = new ResizeObserver(() => {
          element.scrollIntoView({ behavior: "smooth" });
        });
        resizeObserverRef.current.observe(element);
      }
    } else {
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
      <div className="min-h-screen bg-app-shell text-foreground selection:bg-primary/20 selection:text-primary">
        <OnboardingTour />
        
        {isAdminDashboard ? (
          <Outlet />
        ) : shouldDisplayAppNavBar ? (
          <div className="min-h-screen relative">
            {/* Sidebar Sleek Notion/Linear 100% fixe sur Desktop */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Contenu principal décalé avec lg:pl-64 pour s'aligner sur la Sidebar fixe */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-64">
              {/* Header Top sur mobile/tablette */}
              <div className="lg:hidden sticky top-0 z-50">
                <NavBar navigationItems={navigationItems} />
              </div>
              <CommandPalette />

              <main id="contenu-principal" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
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
      <Toaster position="bottom-right" />
    </BrandProvider>
  );
}
