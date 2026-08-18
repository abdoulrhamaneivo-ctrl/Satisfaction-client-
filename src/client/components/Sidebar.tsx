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
  Sparkles,
  SlidersHorizontal,
  Building2,
  Archive,
  MessageSquareQuote
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

  const userRole = (user as any)?.role;
  const isDirection = userRole === 'DIRECTION';
  const isChefAgence = userRole === 'CHEF_AGENCE';
  const isQualite = userRole === 'QUALITE';
  const hasAdminAccess = isDirection || isChefAgence || isQualite;

  return (
    <aside className="w-64 shrink-0 border-r border-border/80 bg-card/95 backdrop-blur-md flex flex-col justify-between h-screen sticky top-0 z-40 overflow-y-auto momentum-scroll select-none text-foreground">
      {/* Top Header: Platform Brand */}
      <div className="p-4 space-y-5">
        <Link 
          to="/dashboard"
          className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/70 hover:bg-muted/70 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <YebaLogo className="size-7 transition-transform group-hover:scale-105" />
            <div>
              <span className="block text-xs font-black font-satoshi text-foreground tracking-tight leading-none">
                {brandConfig?.platform_name || "La Poste CI"}
              </span>
              <span className="block text-[10px] text-muted-foreground font-semibold pt-0.5">
                {(user as any)?.agence?.nom_agence || "Agence Principale"}
              </span>
            </div>
          </div>
          <Sparkles className="size-3.5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Section 1: EXPLOITATION */}
        <div className="space-y-1">
          <span className="block px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
            Exploitation
          </span>

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
              <LayoutDashboard className="size-4" />
              Tableau de bord
            </span>
          </Link>

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
              Incidents & Kanban
            </span>
            {alertTotal > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground shadow-sm animate-pulse">
                {alertTotal}
              </span>
            )}
          </Link>

          <Link
            to="/guichets"
            data-tour="sidebar-guichets"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
              isCurrent('/guichets')
                ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2.5">
              <Store className="size-4" />
              Guichets & Kits QR
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
              Planning Agents
            </span>
          </Link>
        </div>

        {/* Section 2: ÉCOUTE CLIENT & FORMULAIRES */}
        <div className="pt-2 space-y-1">
          <span className="block px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
            Écoute Client
          </span>

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
              <MessageSquareQuote className="size-4" />
              Avis & CSAT
            </span>
          </Link>

          <Link
            to="/criteres"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
              isCurrent('/criteres')
                ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2.5">
              <SlidersHorizontal className="size-4" />
              Formulaires & Critères
            </span>
          </Link>
        </div>

        {/* Section 3: ADMINISTRATION */}
        {hasAdminAccess && (
          <div className="pt-2 space-y-1">
            <span className="block px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              Administration
            </span>

            <Link
              to="/admin/personnel"
              data-tour="sidebar-personnel"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                isCurrent('/admin/personnel')
                  ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2.5">
                <Users className="size-4" />
                Agents & Rôles
              </span>
            </Link>

            {isDirection && (
              <Link
                to="/admin/agences"
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                  isCurrent('/admin/agences')
                    ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Building2 className="size-4" />
                  Réseau Agences
                </span>
              </Link>
            )}

            <Link
              to="/archives"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                isCurrent('/archives')
                  ? "bg-primary/20 text-primary border border-primary/30 font-black shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2.5">
                <Archive className="size-4" />
                Archives
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Footer Section: User profile, Dark Mode, Tutorial Trigger */}
      <div className="p-4 border-t border-border/70 space-y-3 bg-muted/20 mt-auto">
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
