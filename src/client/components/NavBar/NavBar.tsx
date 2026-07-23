import { LogIn, Menu, Bell, ChevronDown, Search } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Link as ReactRouterLink, useLocation } from "react-router";
import { useAuth } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../../client/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../client/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../client/components/ui/dropdown-menu";
import { throttleWithTrailingInvocation } from "../../../shared/utils";
import { UserDropdown } from "../../../user/UserDropdown";
import { UserMenuItems } from "../../../user/UserMenuItems";
import { useNotificationBadge } from "../../hooks/useNotificationBadge";
import { YebaLogo } from '../YebaLogo';
import { cn } from "../../utils";
import { DarkModeSwitcher } from "../DarkModeSwitcher";
import { CommandPaletteTrigger } from "../CommandPalette";
import { useBrand } from "../../context/BrandContext";
import { BrandLogo } from "../BrandLogo";
import { Button } from "../ui/button";

export interface NavigationItem {
  name: string;
  to: string;
  // Rôles Yeba autorisés à voir ce lien. Si absent, visible par tout le
  // monde. Permet de cacher les entrées de menu qui pointent vers des pages
  // restreintes (ex. "Agences" réservé à DIRECTION) au lieu de laisser un
  // CHEF_AGENCE cliquer dessus pour atterrir sur un écran "Accès refusé".
  roles?: string[];
  // Sous-entrées (ex. "Paramètres" regroupant Charte Graphique, Tarifs,
  // Personnel, Critères). Rendu en menu déroulant sur desktop, et en
  // sous-liste repliable sur mobile — pour éviter d'empiler 8 liens à plat
  // dans la barre de navigation.
  children?: NavigationItem[];
}

export function NavBar({
  navigationItems,
}: {
  navigationItems: NavigationItem[];
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { data: currentUser } = useAuth();
  const { brandConfig } = useBrand();

  const filterByRole = (item: NavigationItem): NavigationItem | null => {
    if (item.children) {
      const visibleChildren = item.children.filter(
        (child) => !child.roles || (currentUser && child.roles.includes((currentUser as any).role)),
      );
      if (visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    }
    if (item.roles && !(currentUser && item.roles.includes((currentUser as any).role))) {
      return null;
    }
    return item;
  };

  const visibleNavigationItems = navigationItems
    .map(filterByRole)
    .filter((item): item is NavigationItem => item !== null);

  useEffect(() => {
    const throttledHandler = throttleWithTrailingInvocation(() => {
      setIsScrolled(window.scrollY > 0);
    }, 50);

    window.addEventListener("scroll", throttledHandler);

    return () => {
      window.removeEventListener("scroll", throttledHandler);
      throttledHandler.cancel();
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-border bg-card",
        )}
      >
        <div
          className="mx-auto max-w-[1440px]"
        >
          <nav
            className={cn(
              "flex h-16 items-center justify-between px-4 lg:px-8",
            )}
            aria-label="Global"
          >
            <div className="flex items-center gap-7">
              <WaspRouterLink
                to={routes.LandingPageRoute.to}
                className="flex items-center text-foreground transition-colors hover:text-primary"
              >
                <NavLogo isScrolled={isScrolled} />
                <span className="ml-2 text-sm font-semibold leading-6 text-foreground">
                  {brandConfig?.platform_name || "Yeba"}
                </span>
              </WaspRouterLink>

              <ul className="ml-5 hidden items-center gap-1 lg:flex">
                {renderNavigationItems(visibleNavigationItems, undefined, location.pathname)}
              </ul>
            </div>
            <NavBarMobileMenu
              isScrolled={isScrolled}
              navigationItems={visibleNavigationItems}
              currentPath={location.pathname}
            />
            <NavBarDesktopUserDropdown isScrolled={isScrolled} />
          </nav>
        </div>
      </header>
    </>
  );
}

function NavBarDesktopUserDropdown({ isScrolled }: { isScrolled: boolean }) {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const { total, hasCritical } = useNotificationBadge();

  return (
    <div className="hidden items-center justify-end gap-3 lg:flex lg:flex-1">
      <ul className="flex items-center justify-center gap-2 sm:gap-4">
        <li className="hidden md:block">
          <CommandPaletteTrigger />
        </li>
        <DarkModeSwitcher />
        {/* Badge de notification temps réel (polling 30s) */}
        {!!user && total > 0 && (
          <li>
            <ReactRouterLink
              to="/alertes-taches"
              title={`${total} action${total > 1 ? 's' : ''} en attente`}
              className="relative flex items-center justify-center"
            >
              <Bell
                className={cn(
                  'transition-colors',
                  isScrolled ? 'size-4' : 'size-5',
                  hasCritical ? 'text-destructive' : 'text-warning'
                )}
              />
              <span
                className={cn(
                  'absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-0.5 text-[10px] font-black text-white leading-none',
                  hasCritical ? 'bg-destructive' : 'bg-warning'
                )}
              >
                {total > 99 ? '99+' : total}
              </span>
            </ReactRouterLink>
          </li>
        )}
      </ul>
      {isUserLoading ? null : !user ? (
        <WaspRouterLink
          to={routes.LoginRoute.to}
          className={cn(
            "ml-3 font-semibold leading-6 transition-all duration-300",
            {
              "text-sm": !isScrolled,
              "text-xs": isScrolled,
            },
          )}
        >
          <div className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out">
            Log in{" "}
            <LogIn
              size={isScrolled ? "1rem" : "1.1rem"}
              className={cn("transition-all duration-300", {
                "ml-1 mt-[0.1rem]": !isScrolled,
                "ml-1": isScrolled,
              })}
            />
          </div>
        </WaspRouterLink>
      ) : (
        <div className="ml-3">
          <UserDropdown user={user} />
        </div>
      )}
    </div>
  );
}

function NavBarMobileMenu({
  isScrolled,
  navigationItems,
  currentPath,
}: {
  isScrolled: boolean;
  navigationItems: NavigationItem[];
  currentPath: string;
}) {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { brandConfig } = useBrand();

  return (
    <div className="flex lg:hidden">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-muted"
          >
            <span className="sr-only">Open main menu</span>
            <Menu
              className={cn("transition-all duration-300", {
                "size-8 p-1": !isScrolled,
                "size-6 p-0.5": isScrolled,
              })}
              aria-hidden="true"
            />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-[300px] flex-col p-0 sm:w-[400px]"
        >
          {/* En-tête fixe */}
          <SheetHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6">
            <SheetTitle className="flex items-center">
              <WaspRouterLink to={routes.LandingPageRoute.to}>
                <span className="sr-only">{brandConfig?.platform_name || "Yeba"}</span>
                <NavLogo isScrolled={false} />
              </WaspRouterLink>
            </SheetTitle>
          </SheetHeader>

          {/* Zone défilante : c'est ELLE qui manquait. Sans overflow-y-auto
              ici, un utilisateur avec beaucoup d'entrées de menu (rôle
              DIRECTION / CHEF_AGENCE) voyait son contenu déborder de la
              hauteur de l'écran, sans aucun moyen de scroller pour y accéder. */}
          <div className="min-h-0 flex-1 overflow-y-auto momentum-scroll px-6">
            <div className="divide-border divide-y">
              <ul className="space-y-2 py-6">
                {renderNavigationItems(navigationItems, setMobileMenuOpen, currentPath)}
              </ul>
              <div className="py-6">
                {isUserLoading ? null : !user ? (
                  <WaspRouterLink to={routes.LoginRoute.to}>
                    <div className="text-foreground hover:text-primary flex items-center justify-end transition-colors duration-300 ease-in-out">
                      Log in <LogIn size="1.1rem" className="ml-1" />
                    </div>
                  </WaspRouterLink>
                ) : (
                  <ul className="space-y-2">
                    <UserMenuItems
                      user={user}
                      onItemClick={() => setMobileMenuOpen(false)}
                    />
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Pied de menu FIXE (hors de la zone qui scrolle) : le bouton
              mode sombre/clair est ainsi toujours visible et cliquable,
              quel que soit le nombre d'éléments au-dessus. C'est ce qui
              causait le bug : avant, ce bouton était dans le flux
              défilant et se retrouvait poussé hors écran. */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-border/60 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMobileMenuOpen(false);
                window.dispatchEvent(new Event('yeba:open-command-palette'));
              }}
              className="h-auto justify-start gap-2 rounded-lg border-border/70 bg-card-subtle/60 px-3 py-2 text-sm font-normal text-muted-foreground"
            >
              <Search className="size-4" />
              Rechercher…
            </Button>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Mode sombre</span>
              <DarkModeSwitcher />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function renderNavigationItems(
  navigationItems: NavigationItem[],
  setMobileMenuOpen?: Dispatch<SetStateAction<boolean>>,
  currentPath?: string,
) {
  const menuStyles = cn({
    "block rounded-lg px-3 py-2 text-sm font-medium leading-7 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors":
      !!setMobileMenuOpen,
    "rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground":
      !setMobileMenuOpen,
  });

  return navigationItems.map((item) => {
    const isActive = item.children
      ? item.children.some((child) => currentPath === child.to || currentPath?.startsWith(`${child.to}/`))
      : currentPath === item.to || currentPath?.startsWith(`${item.to}/`);
    const activeStyles = isActive
      ? setMobileMenuOpen
        ? 'bg-primary/10 text-primary'
        : 'bg-primary/10 font-semibold text-primary'
      : '';
    if (item.children && item.children.length > 0) {
      // Mobile : sous-menu repliable, pour ne pas empiler tous les liens
      // "Paramètres" à plat avec le reste de la navigation.
      if (setMobileMenuOpen) {
        return (
          <li key={item.name}>
            <Accordion type="single" collapsible>
              <AccordionItem value={item.name} className="border-none">
                <AccordionTrigger className={cn("rounded-lg px-3 py-2 text-sm font-medium leading-7 text-foreground hover:bg-accent hover:text-accent-foreground hover:no-underline transition-colors", activeStyles)}>
                  {item.name}
                </AccordionTrigger>
                <AccordionContent className="pl-3">
                  <ul className="space-y-1 border-l border-border/60 pl-3">
                    {item.children.map((child) => (
                      <li key={child.name}>
                        <ReactRouterLink
                          to={child.to}
                          className={cn(menuStyles, currentPath === child.to && 'bg-primary/10 text-primary')}
                          aria-current={currentPath === child.to ? 'page' : undefined}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {child.name}
                        </ReactRouterLink>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </li>
        );
      }

      // Desktop : menu déroulant "Paramètres".
      return (
        <li key={item.name}>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(menuStyles, activeStyles, "flex items-center gap-1 outline-none")}>
              {item.name}
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {item.children.map((child) => (
                <DropdownMenuItem key={child.name} asChild>
                  <ReactRouterLink
                    to={child.to}
                    className={cn(currentPath === child.to && 'bg-primary/10 text-primary')}
                    aria-current={currentPath === child.to ? 'page' : undefined}
                  >
                    {child.name}
                  </ReactRouterLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      );
    }

    return (
      <li key={item.name}>
        <ReactRouterLink
          to={item.to}
          className={cn(menuStyles, activeStyles)}
          aria-current={isActive ? 'page' : undefined}
          onClick={setMobileMenuOpen && (() => setMobileMenuOpen(false))}
          target={item.to.startsWith("http") ? "_blank" : undefined}
        >
          {item.name}
        </ReactRouterLink>
      </li>
    );
  });
}

function NavLogo({ isScrolled }: { isScrolled: boolean }) {
  return (
    <BrandLogo 
      className="size-8"
    />
  );
}
