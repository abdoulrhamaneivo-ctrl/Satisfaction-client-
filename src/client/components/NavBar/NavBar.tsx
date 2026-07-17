import { LogIn, Menu, Bell, ChevronDown } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Link as ReactRouterLink } from "react-router";
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
import { CXSATLogo } from '../CXSATLogo';
import { cn } from "../../utils";
import { DarkModeSwitcher } from "../DarkModeSwitcher";
import { useBrand } from "../../context/BrandContext";
import { BrandLogo } from "../BrandLogo";

export interface NavigationItem {
  name: string;
  to: string;
  // Rôles CXSAT autorisés à voir ce lien. Si absent, visible par tout le
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
          "sticky top-0 z-50 transition-all duration-300",
          isScrolled && "xl:mx-30 top-4 mx-4 lg:mx-10",
        )}
      >
        <div
          className={cn("transition-all duration-300", {
            "bg-background/90 border-border mx-4 rounded-full border pr-2 shadow-lg backdrop-blur-lg md:mx-20 lg:pr-0":
              isScrolled,
            "bg-background/80 border-border mx-0 border-b backdrop-blur-lg":
              !isScrolled,
          })}
        >
          <nav
            className={cn(
              "flex items-center justify-between transition-all duration-300",
              {
                "p-3 px-4 lg:p-4 lg:px-5": isScrolled,
                "p-6 lg:px-8": !isScrolled,
              },
            )}
            aria-label="Global"
          >
            <div className="flex items-center gap-6">
              <WaspRouterLink
                to={routes.LandingPageRoute.to}
                className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out"
              >
                <NavLogo isScrolled={isScrolled} />
                <span
                  className={cn(
                    "text-foreground font-semibold leading-6 transition-all duration-300",
                    {
                      "ml-2 text-sm": !isScrolled,
                      "ml-2 text-xs": isScrolled,
                    },
                  )}
                >
                  {brandConfig?.platform_name || "CXSAT"}
                </span>
              </WaspRouterLink>

              <ul className="ml-4 hidden items-center gap-6 lg:flex">
                {renderNavigationItems(visibleNavigationItems)}
              </ul>
            </div>
            <NavBarMobileMenu
              isScrolled={isScrolled}
              navigationItems={visibleNavigationItems}
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
                  hasCritical ? 'text-destructive' : 'text-amber-500'
                )}
              />
              <span
                className={cn(
                  'absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-0.5 text-[10px] font-black text-white leading-none',
                  hasCritical ? 'bg-destructive' : 'bg-amber-500'
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
}: {
  isScrolled: boolean;
  navigationItems: NavigationItem[];
}) {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { brandConfig } = useBrand();

  return (
    <div className="flex lg:hidden">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              "text-muted-foreground hover:text-muted hover:bg-accent inline-flex items-center justify-center rounded-md transition-colors",
            )}
          >
            <span className="sr-only">Open main menu</span>
            <Menu
              className={cn("transition-all duration-300", {
                "size-8 p-1": !isScrolled,
                "size-6 p-0.5": isScrolled,
              })}
              aria-hidden="true"
            />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-[300px] flex-col p-0 sm:w-[400px]"
        >
          {/* En-tête fixe */}
          <SheetHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6">
            <SheetTitle className="flex items-center">
              <WaspRouterLink to={routes.LandingPageRoute.to}>
                <span className="sr-only">{brandConfig?.platform_name || "CXSAT"}</span>
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
                {renderNavigationItems(navigationItems, setMobileMenuOpen)}
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
          <div className="flex shrink-0 items-center justify-between border-t border-border/60 px-6 py-4">
            <span className="text-sm font-medium text-foreground">Mode sombre</span>
            <DarkModeSwitcher />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function renderNavigationItems(
  navigationItems: NavigationItem[],
  setMobileMenuOpen?: Dispatch<SetStateAction<boolean>>,
) {
  const menuStyles = cn({
    "block rounded-lg px-3 py-2 text-sm font-medium leading-7 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors":
      !!setMobileMenuOpen,
    "text-sm font-normal leading-6 text-foreground duration-300 ease-in-out hover:text-primary transition-colors":
      !setMobileMenuOpen,
  });

  return navigationItems.map((item) => {
    if (item.children && item.children.length > 0) {
      // Mobile : sous-menu repliable, pour ne pas empiler tous les liens
      // "Paramètres" à plat avec le reste de la navigation.
      if (setMobileMenuOpen) {
        return (
          <li key={item.name}>
            <Accordion type="single" collapsible>
              <AccordionItem value={item.name} className="border-none">
                <AccordionTrigger className="rounded-lg px-3 py-2 text-sm font-medium leading-7 text-foreground hover:bg-accent hover:text-accent-foreground hover:no-underline transition-colors">
                  {item.name}
                </AccordionTrigger>
                <AccordionContent className="pl-3">
                  <ul className="space-y-1 border-l border-border/60 pl-3">
                    {item.children.map((child) => (
                      <li key={child.name}>
                        <ReactRouterLink
                          to={child.to}
                          className={menuStyles}
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
            <DropdownMenuTrigger className={cn(menuStyles, "flex items-center gap-1 outline-none")}>
              {item.name}
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {item.children.map((child) => (
                <DropdownMenuItem key={child.name} asChild>
                  <ReactRouterLink to={child.to}>{child.name}</ReactRouterLink>
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
          className={menuStyles}
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
      className={cn("transition-all duration-500", {
        "size-8": !isScrolled,
        "size-7": isScrolled,
      })} 
    />
  );
}
