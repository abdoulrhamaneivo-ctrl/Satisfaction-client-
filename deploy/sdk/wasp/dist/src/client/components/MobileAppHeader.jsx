import { Menu, Bell } from 'lucide-react';
import { Link } from 'react-router';
import { useBrand } from '../context/BrandContext';
import { useNotificationBadge } from '../hooks/useNotificationBadge';
import { YebaLogo } from './YebaLogo';
import { Button } from './ui/button';
import { cn } from '../utils';
export function MobileAppHeader({ onMenuOpen, menuOpen = false }) {
    const { brandConfig } = useBrand();
    const { total, hasCritical } = useNotificationBadge();
    return (<header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-card/95 shadow-sm">
      <div className="flex h-16 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button type="button" variant="ghost" size="icon" onClick={onMenuOpen} aria-expanded={menuOpen} aria-controls="mobile-sidebar" aria-label="Ouvrir le menu de navigation" className="size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70">
            <Menu className="size-5" aria-hidden/>
          </Button>

          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <YebaLogo className="size-7 shrink-0"/>
            <span className="truncate text-sm font-bold font-satoshi text-foreground tracking-tight">
              {brandConfig?.platform_name || 'Yéba'}
            </span>
          </Link>
        </div>

        {total > 0 && (<Link to="/alertes-taches" title={`${total} action${total > 1 ? 's' : ''} en attente`} aria-label={`${total} incident${total > 1 ? 's' : ''} en attente`} className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <Bell className={cn('size-4', hasCritical ? 'text-destructive motion-safe:animate-pulse' : 'text-warning')} aria-hidden/>
            <span className={cn('absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white leading-none shadow-sm', hasCritical ? 'bg-destructive' : 'bg-warning')}>
              {total > 99 ? '99+' : total}
            </span>
          </Link>)}
      </div>
    </header>);
}
//# sourceMappingURL=MobileAppHeader.jsx.map