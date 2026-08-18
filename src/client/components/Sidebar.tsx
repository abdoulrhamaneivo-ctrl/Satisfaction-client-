import React from 'react';
import { Link, useLocation } from 'react-router';
import { 
  Inbox, 
  CheckSquare, 
  Calendar, 
  BarChart3, 
  Store, 
  Users, 
  Settings, 
  HelpCircle, 
  ChevronDown,
  LayoutDashboard,
  Bell,
  Sparkles
} from 'lucide-react';
import { useAuth } from 'wasp/client/auth';
import { useBrand } from '../context/BrandContext';
import { YebaLogo } from './YebaLogo';
import { DarkModeSwitcher } from './DarkModeSwitcher';
import { TriggerOnboardingButton } from './OnboardingTour';
import { useNotificationBadge } from '../hooks/useNotificationBadge';
import { cn } from '../utils';

export function Sidebar() {
  const location = useLocation();
  const { data: user } = useAuth();
  const { brandConfig } = useBrand();
  const { total: alertTotal } = useNotificationBadge();

  const isCurrent = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="w-64 shrink-0 border-r border-border/80 bg-card/95 backdrop-blur-md flex flex-col justify-between h-screen sticky top-0 z-40 select-none text-foreground">
      {/* Top Header: Company / Agence Switcher Pill */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/70 hover:bg-muted/70 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <YebaLogo className="size-7" />
            <div>
              <span className="block text-xs font-black font-satoshi text-foreground tracking-tight leading-none">
                {brandConfig?.platform_name || "La Poste CI"}
              </span>
              <span className="block text-[10px] text-muted-foreground font-semibold pt-0.5">
                Agence Principale
              </span>
            </div>
          </div>
          <ChevronDown className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>

        {/* Main Section Navigation */}
        <nav className="space-y-1">
          <Link
            to="/alertes-taches"
            data-tour="sidebar-inbox"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
              isCurrent('/alertes-taches')
                ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2.5">
              <Inbox className="size-4" />
              Inbox Incidents
            </span>
            {alertTotal > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground shadow-sm">
                {alertTotal}
              </span>
            )}
          </Link>

          <Link
            to="/dashboard"
            data-tour="sidebar-kanban"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
              isCurrent('/dashboard')
                ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2.5">
              <CheckSquare className="size-4" />
              Mes tâches & Kanban
            </span>
          </Link>

          <Link
            to="/planning"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
              isCurrent('/planning')
                ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2.5">
              <Calendar className="size-4" />
              Planning & Présence
            </span>
          </Link>

          <Link
            to="/avis"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
              isCurrent('/avis')
                ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2.5">
              <BarChart3 className="size-4" />
              Analyses & CSAT
            </span>
          </Link>
        </nav>

        {/* Group Section: GUICHETS & KITS (Linear style with dot indicators) */}
        <div className="pt-4 space-y-2">
          <span className="block px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
            GUICHETS & KITS
          </span>

          <div className="space-y-0.5">
            <Link
              to="/guichets"
              data-tour="sidebar-guichets"
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                isCurrent('/guichets')
                  ? "bg-muted text-foreground font-black"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-primary" />
                Caisse Courrier 1
              </span>
            </Link>

            <Link
              to="/guichets"
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-200"
            >
              <span className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-secondary" />
                Accueil & Information
              </span>
            </Link>

            <Link
              to="/guichets"
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-200"
            >
              <span className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-emerald-400" />
                Guichet Chronopost
              </span>
            </Link>
          </div>
        </div>

        {/* Group Section: ADMINISTRATION (si l'utilisateur a les rôles) */}
        {user && ((user as any).role === 'CHEF_AGENCE' || (user as any).role === 'DIRECTION' || (user as any).role === 'QUALITE') && (
          <div className="pt-4 space-y-2">
            <span className="block px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              ADMINISTRATION
            </span>

            <div className="space-y-0.5">
              <Link
                to="/admin/personnel"
                data-tour="sidebar-personnel"
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                  isCurrent('/admin/personnel')
                    ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="size-4" />
                  Agents & Rôles
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer Section: User profile, Dark Mode, Tutorial Trigger */}
      <div className="p-4 border-t border-border/70 space-y-3 bg-muted/20">
        <TriggerOnboardingButton />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="size-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-black text-xs shrink-0">
              {user ? (user as any).email?.[0]?.toUpperCase() : 'A'}
            </div>
            <div className="truncate">
              <span className="block text-xs font-black font-satoshi truncate leading-none">
                {user ? (user as any).email : 'Agent La Poste'}
              </span>
              <span className="block text-[10px] text-muted-foreground font-semibold truncate pt-0.5">
                {user ? (user as any).role || 'CHEF_AGENCE' : 'Non connecté'}
              </span>
            </div>
          </div>
          <DarkModeSwitcher />
        </div>
      </div>
    </aside>
  );
}
