import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useQuery } from 'wasp/client/operations'
import { getPlatformMe } from 'wasp/client/operations'
import { Building2, ShieldCheck, ScrollText, LogOut, Menu, X, ArrowLeft } from 'lucide-react'

/**
 * PlatformShell — console Yeba Platform (Doc 12 §2).
 * Sidebar SOMBRE (noir institutionnel) pour distinguer immédiatement de
 * l'espace client. Garde front : platformRole SUPER_ADMIN/SUPPORT exigé —
 * rappel : la vraie barrière est requirePlatformRole côté serveur.
 */
export function PlatformShell() {
  const navigate = useNavigate()
  // getPlatformMe lève un 403 côté serveur si le connecté n'est pas
  // SUPER_ADMIN/SUPPORT → useQuery le remonte dans `error`. C'est le signal
  // d'interdiction (le front n'est jamais la protection, il ne fait que
  // refléter la décision du middleware).
  const { data: me, isLoading: loadingMe, error: erreurMe } = useQuery(getPlatformMe)
  const [menuOpen, setMenuOpen] = useState(false)

  if (loadingMe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(216_40%_12%)]">
        <p className="text-sm text-white/60">Chargement de la console…</p>
      </div>
    )
  }

  if (erreurMe || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(216_40%_12%)] p-6">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <ShieldCheck className="mx-auto size-10 text-warning" />
          <h1 className="mt-4 text-xl font-bold text-white">Accès réservé</h1>
          <p className="mt-2 text-sm text-white/70">
            Cette console est réservée aux administrateurs Yeba Platform.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            <ArrowLeft className="size-4" /> Retour à l'application
          </button>
        </div>
      </div>
    )
  }

  const LINKS = [
    { to: '/platform', label: 'Overview', icon: Building2, end: true },
    { to: '/platform/entreprises', label: 'Entreprises', icon: Building2 },
    { to: '/platform/audit', label: 'Audit', icon: ScrollText },
    { to: '/platform/securite', label: 'Sécurité', icon: ShieldCheck },
  ]

  const support = me.platformRole === 'SUPPORT'

  return (
    <div className="flex min-h-screen bg-[hsl(216_40%_12%)] text-foreground">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[hsl(216_45%_10%)] p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 pt-2">
          <span className="text-lg font-black tracking-tight text-white">
            ⬢ <span className="text-warning">YEBA</span> PLATFORM
          </span>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Console platform">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-warning/15 text-warning' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-4" /> Retour à l'app
          </button>
        </div>
      </aside>

      {/* Drawer mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Fermer" className="absolute inset-0 bg-black/70" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[hsl(216_45%_10%)] p-4">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-base font-black text-white">⬢ <span className="text-warning">YEBA</span></span>
              <button aria-label="Fermer" onClick={() => setMenuOpen(false)} className="text-white"><X className="size-5" /></button>
            </div>
            <nav className="flex flex-col gap-1">
              {LINKS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                      isActive ? 'bg-warning/15 text-warning' : 'text-white/70 hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="size-4" /> {label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Contenu */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-8">
          <button className="text-white md:hidden" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <Menu className="size-6" />
          </button>
          <span className="hidden text-xs font-bold uppercase tracking-widest text-white/40 md:block">
            Console propriétaire — accès restreint
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-white sm:block">
              {me.prenom} {me.nom}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
              support ? 'bg-info/20 text-info' : 'bg-warning/20 text-warning'
            }`}>
              {me.platformRole}
            </span>
          </div>
        </header>
        <main className="flex-1 bg-[hsl(216_30%_96%)] p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
