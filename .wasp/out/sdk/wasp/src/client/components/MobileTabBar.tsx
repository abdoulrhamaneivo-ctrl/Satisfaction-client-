// src/client/components/MobileTabBar.tsx
// ============================================================================
// Task 1 (SDD 2026-10-04) — Tab-bar mobile admin (4 actions tactiles).
//
// Le drawer seul obligeait 2 taps + visée précise pour changer d'écran ;
// la tab-bar expose les 3 destinations quotidiennes (Dashboard, Avis,
// Alertes) + une action de création au pouce, en bas d'écran.
//
// - `lg:hidden` : desktop inchangé (Sidebar existante conservée).
// - Chaque action >= 44px (WCAG 2.2 AA 2.5.8) + safe-area iOS.
// - `prefers-reduced-motion` : aucun mouvement, seul l'état actif change.
// - Le badge reprend useNotificationBadge (même source que le header).
// - « +Créer » ouvre la palette de commande (même événement que le
//   bouton « Rechercher… » de la Sidebar) : un seul geste vers toutes
//   les actions de création, sans deviner la page cible.
// ============================================================================
import { LayoutDashboard, MessageSquareQuote, Bell, PlusCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useNotificationBadge } from '../hooks/useNotificationBadge';
import { cn } from '../utils';

const ACTIONS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/avis', label: 'Avis', Icon: MessageSquareQuote },
  { to: '/alertes-taches', label: 'Alertes', Icon: Bell },
] as const;

export function MobileTabBar() {
  const location = useLocation();
  const { total } = useNotificationBadge();

  const estActif = (to: string) =>
    to === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(to);

  const ouvrirCreation = () => {
    window.dispatchEvent(new Event('yeba:open-command-palette'));
  };

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 gap-1 px-2 pb-2 pt-1.5">
        {ACTIONS.map(({ to, label, Icon }) => {
          const actif = estActif(to);
          const badge = to === '/alertes-taches' ? total : 0;
          return (
            <Link
              key={to}
              to={to}
              aria-current={actif ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                actif ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {badge > 0 && (
                  <span
                    aria-label={`${badge} notification${badge > 1 ? 's' : ''}`}
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={ouvrirCreation}
          aria-label="Créer — ouvrir la palette d'actions"
          className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl bg-primary px-1 py-1.5 text-[10px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusCircle className="size-5" aria-hidden />
          Créer
        </button>
      </div>
    </nav>
  );
}
