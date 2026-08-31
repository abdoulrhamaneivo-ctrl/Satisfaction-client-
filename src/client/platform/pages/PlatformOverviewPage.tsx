import { useQuery } from 'wasp/client/operations'
import { getPlatformOverview } from 'wasp/client/operations'
import { Link } from 'react-router'
import { Building2, Users, MessageSquare, CheckCircle2, PauseCircle, Plus, ArrowRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

/** Chip de statut entreprise (Doc 12 §4). */
export function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-success/10 text-success border-success/25',
    TRIAL: 'bg-info/10 text-info border-info/25',
    SUSPENDED: 'bg-destructive/10 text-destructive border-destructive/25',
    CANCELLED: 'bg-muted text-muted-foreground border-border',
  }
  const labels: Record<string, string> = {
    ACTIVE: 'ACTIVE', TRIAL: 'ESSAI', SUSPENDED: 'SUSPENDUE', CANCELLED: 'RÉSILIÉE',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${styles[status] ?? styles.CANCELLED}`}>
      {status === 'SUSPENDED' && <PauseCircle className="size-3" />}
      {labels[status] ?? status}
    </span>
  )
}

export function PlanChip({ plan }: { plan: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
      {plan}
    </span>
  )
}

/** Page d'accueil de la console (Doc 12 §3). */
export default function PlatformOverviewPage() {
  const { data, isLoading } = useQuery(getPlatformOverview)

  if (isLoading || !data) {
    return <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Chargement…</div>
  }

  const tiles = [
    { label: 'Entreprises', value: data.entreprises_total, icon: Building2, tone: 'text-primary' },
    { label: 'Actives', value: data.entreprises_actives, icon: CheckCircle2, tone: 'text-success' },
    { label: 'Utilisateurs', value: data.utilisateurs, icon: Users, tone: 'text-foreground' },
    { label: 'Avis collectés', value: data.avis_collectes, icon: MessageSquare, tone: 'text-foreground' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
          Vue d'ensemble
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          État de la plateforme Yeba — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
              <Icon className={`size-4 ${tone}`} />
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-foreground">
              {new Intl.NumberFormat('fr-FR').format(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Évolution */}
      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Évolution des créations d'entreprises (12 mois)
        </h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.evolution}>
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="count" name="Créations" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Entreprises récentes */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Entreprises récentes</h2>
          <Link to="/platform/entreprises" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            Voir toutes <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-3">
          {data.recentes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Building2 className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Aucune entreprise cliente pour le moment.</p>
              <Link
                to="/platform/entreprises/nouvelle"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-4" /> Créer la première entreprise
              </Link>
            </div>
          ) : (
            data.recentes.map((e: { id: number; nom_entreprise: string; nom_court: string | null; status: string; plan: string; email_administratif: string | null }) => (
              <Link
                key={e.id}
                to={`/platform/entreprises/${e.id}`}
                className="hover-lift flex items-center justify-between rounded-2xl border border-border/80 bg-card p-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-bold text-foreground">{e.nom_entreprise}</span>
                    <StatusChip status={e.status} />
                    <PlanChip plan={e.plan} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{e.email_administratif || '—'}</p>
                </div>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
