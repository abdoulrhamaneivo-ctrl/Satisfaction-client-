import React from 'react';
import { Link, useLocation } from 'react-router';
import { Inbox, Calendar, Store, Users, Settings, LayoutDashboard, SlidersHorizontal, Building2, Archive, MessageSquareQuote, Search, LogOut, ShieldCheck, PlusCircle, ScrollText, Lock, } from 'lucide-react';
import { useAuth, logout } from 'wasp/client/auth';
import { useBrand } from '../context/BrandContext';
import { YebaLogo } from './YebaLogo';
import { DarkModeSwitcher } from './DarkModeSwitcher';
import { TriggerOnboardingButton } from './OnboardingTour';
import { useNotificationBadge } from '../hooks/useNotificationBadge';
import { Sheet, SheetContent, SheetTitle, } from './ui/sheet';
import { cn } from '../utils';
function navLinkClass(isActive) {
    return cn('relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card', isActive
        ? 'bg-primary/15 text-primary border border-primary/25 shadow-sm font-bold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:rounded-r-full before:bg-primary'
        : 'text-muted-foreground border border-transparent hover:bg-muted/60 hover:text-foreground hover:border-border/50');
}
function NavItem({ to, icon: Icon, label, isActive, badge, tourId, onNavigate }) {
    return (<Link to={to} data-tour={tourId} aria-current={isActive ? 'page' : undefined} className={navLinkClass(isActive)} onClick={onNavigate}>
      <span className="flex items-center gap-2.5 pl-1">
        <Icon className="size-4 shrink-0" aria-hidden/>
        {label}
      </span>
      {badge !== undefined && badge > 0 && (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-sm motion-safe:animate-pulse" aria-label={`${badge} notification${badge > 1 ? 's' : ''}`}>
          {badge}
        </span>)}
    </Link>);
}
export function SidebarContent({ onNavigate, className }) {
    const location = useLocation();
    const { data: user } = useAuth();
    const { brandConfig } = useBrand();
    const { total: alertTotal } = useNotificationBadge();
    const isCurrent = (path) => {
        if (path === '/dashboard' && location.pathname === '/dashboard')
            return true;
        if (path !== '/dashboard' && location.pathname.startsWith(path))
            return true;
        return false;
    };
    const userRole = user?.role;
    const platformRole = user?.platformRole;
    const isPlatformAccount = platformRole === 'SUPER_ADMIN' || platformRole === 'SUPPORT';
    // Un compte PLATEFORME n'a AUCUN périmètre entreprise (Doc 12) : sa seule
    // navigation est la console /platform. On n'affiche donc aucun item métier.
    if (isPlatformAccount) {
        return (<div className={cn('flex h-full flex-col justify-between overflow-y-auto momentum-scroll select-none text-foreground', className)}>
        <div className="p-4 space-y-5">
          <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/70">
            <div className="flex items-center gap-3">
              <YebaLogo className="size-7"/>
              <div>
                <span className="block text-xs font-bold font-satoshi text-foreground tracking-tight leading-none">
                  {brandConfig?.platform_name || 'Yéba'} Platform
                </span>
                <span className="block text-[10px] text-muted-foreground font-semibold pt-0.5">
                  Console opérateur
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="block px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Pilotage
            </span>
            <NavItem to="/platform" icon={LayoutDashboard} label="Vue d'ensemble" isActive={location.pathname === '/platform'} onNavigate={onNavigate}/>
            <NavItem to="/platform/entreprises" icon={Building2} label="Entreprises" isActive={isCurrent('/platform/entreprises')} onNavigate={onNavigate}/>
            {platformRole === 'SUPER_ADMIN' && (<NavItem to="/platform/entreprises/nouvelle" icon={PlusCircle} label="Nouvelle entreprise" isActive={isCurrent('/platform/entreprises/nouvelle')} onNavigate={onNavigate}/>)}
          </div>

          <div className="pt-2 space-y-1">
            <span className="block px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Supervision
            </span>
            <NavItem to="/platform/audit" icon={ScrollText} label="Journal d'audit" isActive={isCurrent('/platform/audit')} onNavigate={onNavigate}/>
            <NavItem to="/platform/securite" icon={Lock} label="Sécurité" isActive={isCurrent('/platform/securite')} onNavigate={onNavigate}/>
          </div>
        </div>

        <div className="p-4 border-t border-border/70 space-y-3 bg-muted/20 mt-auto">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs shrink-0">
              {user ? user.email?.[0]?.toUpperCase() : 'A'}
            </div>
            <div className="truncate flex-1 min-w-0">
              <span className="block text-xs font-bold font-satoshi truncate leading-none">
                {user ? user.email : 'Non connecté'}
              </span>
              <span className="block text-[10px] text-muted-foreground font-semibold truncate pt-0.5">
                {platformRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Support'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1 pt-1">
            <div className="flex items-center gap-1">
              <DarkModeSwitcher />
              <button type="button" onClick={() => logout()} title="Se déconnecter" aria-label="Se déconnecter" className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <LogOut className="size-4" aria-hidden/>
              </button>
            </div>
          </div>
        </div>
      </div>);
    }
    const isDirection = userRole === 'DIRECTION';
    const isChefAgence = userRole === 'CHEF_AGENCE';
    const hasAdminAccess = isDirection || isChefAgence;
    return (<div className={cn('flex h-full flex-col justify-between overflow-y-auto momentum-scroll select-none text-foreground', className)}>
      <div className="p-4 space-y-5">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/70 hover:bg-muted/70 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <div className="flex items-center gap-3">
            <YebaLogo className="size-7 transition-transform group-hover:scale-105"/>
            <div>
              <span className="block text-xs font-bold font-satoshi text-foreground tracking-tight leading-none">
                {brandConfig?.platform_name || 'Yéba'}
              </span>
              <span className="block text-[10px] text-muted-foreground font-semibold pt-0.5">
                {user?.agence?.nom_agence || 'Agence Principale'}
              </span>
            </div>
          </div>
        </Link>

        <div>
          <button type="button" onClick={() => {
            onNavigate?.();
            window.dispatchEvent(new Event('yeba:open-command-palette'));
        }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium border border-border/80 bg-card-subtle/80 text-muted-foreground hover:text-foreground hover:bg-muted/70 hover:border-primary/20 transition-all group shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <span className="flex items-center gap-2.5">
              <Search className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors"/>
              <span>Rechercher…</span>
            </span>
            <kbd className="rounded border border-border/70 bg-card px-1.5 py-0.5 text-[9px] font-mono font-semibold text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="space-y-1">
          <span className="block px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Exploitation
          </span>

          <NavItem to="/dashboard" icon={LayoutDashboard} label="Tableau de bord" isActive={isCurrent('/dashboard')} tourId="sidebar-kanban" onNavigate={onNavigate}/>

          <NavItem to="/alertes-taches" icon={Inbox} label="Incidents & Kanban" isActive={isCurrent('/alertes-taches')} badge={alertTotal} tourId="sidebar-inbox" onNavigate={onNavigate}/>

          <NavItem to="/guichets" icon={Store} label="Guichets & Kits QR" isActive={isCurrent('/guichets')} tourId="sidebar-guichets" onNavigate={onNavigate}/>

          <NavItem to="/planning" icon={Calendar} label="Planning Agents" isActive={isCurrent('/planning')} onNavigate={onNavigate}/>
        </div>

        <div className="pt-2 space-y-1">
          <span className="block px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Écoute Client
          </span>

          <NavItem to="/avis" icon={MessageSquareQuote} label="Avis & CSAT" isActive={isCurrent('/avis')} onNavigate={onNavigate}/>

          <NavItem to="/criteres" icon={SlidersHorizontal} label="Formulaires & Critères" isActive={isCurrent('/criteres')} onNavigate={onNavigate}/>
        </div>

        {hasAdminAccess && (<div className="pt-2 space-y-1">
            <span className="block px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Administration
            </span>

            <NavItem to="/admin/personnel" icon={Users} label="Agents & Rôles" isActive={isCurrent('/admin/personnel')} tourId="sidebar-personnel" onNavigate={onNavigate}/>

            {isDirection && (<NavItem to="/admin/agences" icon={Building2} label="Réseau Agences" isActive={isCurrent('/admin/agences')} onNavigate={onNavigate}/>)}

            <NavItem to="/archives" icon={Archive} label="Archives" isActive={isCurrent('/archives')} onNavigate={onNavigate}/>

            <NavItem to="/settings" icon={Settings} label="Paramètres" isActive={isCurrent('/settings')} onNavigate={onNavigate}/>
          </div>)}
      </div>

      <div className="p-4 border-t border-border/70 space-y-3 bg-muted/20 mt-auto">
        <TriggerOnboardingButton />

        {/* Console Platform — lien discret réservé aux SUPER_ADMIN (Doc 12 §9).
            Commodité uniquement : la vraie protection est requirePlatformRole. */}
        {user?.platformRole === 'SUPER_ADMIN' && (<a href="/platform" onClick={onNavigate} className="flex items-center gap-2.5 rounded-xl border border-warning/25 bg-warning/5 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-warning hover:bg-warning/10 transition-colors">
            <ShieldCheck className="size-3.5" aria-hidden/>
            Console Platform
          </a>)}

        <div className="flex items-center gap-2.5 pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
            <div className="size-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs shrink-0">
              {user ? user.email?.[0]?.toUpperCase() : 'A'}
            </div>
            <div className="truncate flex-1 min-w-0">
              <span className="block text-xs font-bold font-satoshi truncate leading-none">
                {user ? (user.nom ? `${user.prenom || ''} ${user.nom}`.trim() : user.email) : 'Agent Agence'}
              </span>
              <span className="block text-[10px] text-muted-foreground font-semibold truncate pt-0.5">
                {user ? user.role || 'CHEF_AGENCE' : 'Non connecté'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 pt-1">
          <div className="flex items-center gap-1">
            <DarkModeSwitcher />
            <Link to="/settings" title="Paramètres" aria-label="Paramètres" onClick={onNavigate} className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <Settings className="size-4" aria-hidden/>
            </Link>
            {user && (<button type="button" onClick={() => logout()} title="Se déconnecter" aria-label="Se déconnecter" className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <LogOut className="size-4" aria-hidden/>
              </button>)}
          </div>
        </div>
      </div>
    </div>);
}
export function Sidebar() {
    return (<aside aria-label="Navigation principale" className="w-64 shrink-0 border-r border-border/80 bg-card h-screen fixed top-0 left-0 z-40 shadow-sm">
      <SidebarContent />
    </aside>);
}
export function MobileSidebarDrawer({ open, onOpenChange }) {
    const closeDrawer = () => onOpenChange(false);
    return (<Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent id="mobile-sidebar" side="left" aria-describedby={undefined} className="w-64 max-w-[85vw] p-0 border-r border-border/80 bg-card [&>button]:hidden">
        <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
        <SidebarContent onNavigate={closeDrawer} className="h-full"/>
      </SheetContent>
    </Sheet>);
}
