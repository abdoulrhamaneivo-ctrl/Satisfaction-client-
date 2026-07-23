import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routes } from 'wasp/client/router';
import { AlertOctagon, Clock, CheckCircle2, ChevronRight, Siren } from 'lucide-react';
import { cn } from '../utils';

type AlerteItem = {
  id: string;
  message: string;
  type_alerte: string;
  date_creation: string;
  guichet: string | null;
  gravite: 'HAUTE' | 'MOYENNE';
};

type TacheItem = {
  id: string;
  titre: string;
  date_echeance: string;
  responsable: string;
  guichet: string | null;
  joursRetard: number;
};

interface ActionsPrioritairesProps {
  alertesNouvelles: AlerteItem[];
  tachesEnRetard: TacheItem[];
  isLoading?: boolean;
}

export const ActionsPrioritaires = ({
  alertesNouvelles,
  tachesEnRetard,
  isLoading,
}: ActionsPrioritairesProps) => {
  const total = alertesNouvelles.length + tachesEnRetard.length;

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />;
  }

  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 px-6 py-4"
      >
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <p className="text-sm font-medium text-foreground">
          Rien d'urgent à traiter aujourd'hui : aucune alerte nouvelle, aucune tâche en retard.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5 shadow-premium"
    >
      <div className="flex items-center justify-between gap-3 border-b border-destructive/20 px-6 py-4">
        <div className="flex items-center gap-2">
          <Siren className="size-5 text-destructive" />
          <h2 className="text-title-sm font-bold text-foreground">
            À traiter aujourd'hui <span className="text-destructive">({total})</span>
          </h2>
        </div>
        <Link
          to={routes.AlertesTachesRoute.to}
          className="inline-flex items-center gap-1 text-sm font-semibold text-destructive hover:underline"
        >
          Tout voir <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 divide-y divide-destructive/10 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        {/* Alertes nouvelles */}
        <div className="p-4">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Alertes non traitées ({alertesNouvelles.length})
          </p>
          {alertesNouvelles.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Aucune alerte nouvelle.</p>
          ) : (
            <ul className="space-y-1.5">
              {alertesNouvelles.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2.5 rounded-xl bg-card px-3 py-2.5 shadow-sm"
                >
                  <AlertOctagon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      a.gravite === 'HAUTE' ? 'text-destructive' : 'text-warning'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.guichet ? `${a.guichet} · ` : ''}
                      {new Date(a.date_creation).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tâches en retard */}
        <div className="p-4">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Tâches correctives en retard ({tachesEnRetard.length})
          </p>
          {tachesEnRetard.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Aucune tâche en retard.</p>
          ) : (
            <ul className="space-y-1.5">
              {tachesEnRetard.slice(0, 5).map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-2.5 rounded-xl bg-card px-3 py-2.5 shadow-sm"
                >
                  <Clock className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{t.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.responsable} · {t.joursRetard} jour{t.joursRetard > 1 ? 's' : ''} de retard
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};
