import React, { useState } from 'react';
import { useQuery, useAction } from 'wasp/client/operations';
import {
  getArchives,
  desarchiverGuichet,
  desarchiverAgence,
  desarchiverAlerte,
  desarchiverTache,
} from 'wasp/client/operations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  Building2,
  Store,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  MapPin,
  Search,
} from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { PageHeader } from '../components/PageHeader';
import { MotionCard } from '../components/MotionCard';
import { EmptyState } from '../components/EmptyState';
import { RequireAuth } from '../components/RequireAuth';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';

type Onglet = 'guichets' | 'agences' | 'alertes' | 'taches';

const ONGLETS: { key: Onglet; label: string; icon: React.ReactNode }[] = [
  { key: 'guichets', label: 'Guichets', icon: <Store className="size-4" /> },
  { key: 'agences', label: 'Agences', icon: <Building2 className="size-4" /> },
  { key: 'alertes', label: 'Alertes', icon: <AlertTriangle className="size-4" /> },
  { key: 'taches', label: 'Tâches', icon: <CheckCircle2 className="size-4" /> },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Page Archives : là où atterrissent les guichets/agences fermés et les
 * alertes/tâches résolues de longue date — jamais supprimés, juste sortis
 * des vues actives. Chaque élément peut être restauré (« Désarchiver ») en
 * un clic par un profil de gestion.
 */
export const ArchivesPage = () => (
  <RequireAuth>
    <AmbientBackground className="px-4 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Historique & conformité"
          title="Archives"
          description="Guichets et agences fermés, alertes et tâches résolues depuis longtemps. Rien n'est jamais supprimé : tout reste consultable et compte toujours dans les statistiques."
          icon={Archive}
        />
        <ArchivesContent />
      </div>
    </AmbientBackground>
  </RequireAuth>
);

function ArchivesContent() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery(getArchives);
  const [onglet, setOnglet] = useState<Onglet>('guichets');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');

  const desGuichet = useAction(desarchiverGuichet);
  const desAgence = useAction(desarchiverAgence);
  const desAlerte = useAction(desarchiverAlerte);
  const desTache = useAction(desarchiverTache);

  const guichets: any[] = data?.guichets || [];
  const agences: any[] = data?.agences || [];
  const alertes: any[] = data?.alertes || [];
  const taches: any[] = data?.taches || [];

  const compteurs: Record<Onglet, number> = {
    guichets: guichets.length,
    agences: agences.length,
    alertes: alertes.length,
    taches: taches.length,
  };

  const restaurer = async (cle: string, fn: () => Promise<any>, libelle: string) => {
    if (busyId) return;
    setBusyId(cle);
    try {
      await fn();
      toast({ title: 'Restauré', description: `« ${libelle} » est de nouveau actif.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Erreur inconnue' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {/* Onglets */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border/70 pb-3">
        {ONGLETS.map((o) => (
          <Button
            key={o.key}
            type="button"
            variant={onglet === o.key ? 'default' : 'ghost'}
            onClick={() => setOnglet(o.key)}
            className={onglet === o.key ? 'rounded-full shadow-premium' : 'rounded-full text-muted-foreground'}
          >
            {o.icon}
            {o.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                onglet === o.key ? 'bg-white/20' : 'bg-muted-foreground/10'
              }`}
            >
              {compteurs[o.key]}
            </span>
          </Button>
        ))}
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={recherche}
          onChange={(event) => setRecherche(event.target.value)}
          placeholder={`Rechercher dans les ${onglet} archivés…`}
          className="h-10 pl-9"
          aria-label="Rechercher dans les archives"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border/60 bg-card-subtle/50" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {onglet === 'guichets' && (
            <ListeArchive
              key="guichets"
              items={guichets}
              recherche={recherche}
              vide={{ icon: Store, title: 'Aucun guichet archivé', description: "Les guichets fermés définitivement apparaîtront ici." }}
              render={(g) => ({
                titre: g.nom_guichet,
                sousTitre: g.agence?.nom_agence ? `Agence : ${g.agence.nom_agence}` : undefined,
                date: g.date_archivage,
                busy: busyId === `g${g.id}`,
                onRestaurer: () => restaurer(`g${g.id}`, () => desGuichet({ id_guichet: g.id }), g.nom_guichet),
              })}
            />
          )}
          {onglet === 'agences' && (
            <ListeArchive
              key="agences"
              items={agences}
              recherche={recherche}
              vide={{ icon: Building2, title: 'Aucune agence archivée', description: "Les agences fermées définitivement apparaîtront ici." }}
              render={(a) => ({
                titre: a.nom_agence,
                sousTitre: a.commune,
                date: a.date_archivage,
                busy: busyId === `a${a.id}`,
                onRestaurer: () => restaurer(`a${a.id}`, () => desAgence({ id_agence: a.id }), a.nom_agence),
              })}
            />
          )}
          {onglet === 'alertes' && (
            <ListeArchive
              key="alertes"
              items={alertes}
              recherche={recherche}
              vide={{ icon: AlertTriangle, title: 'Aucune alerte archivée', description: "Les alertes traitées depuis plus de 6 mois y sont déplacées automatiquement." }}
              render={(al) => ({
                titre: al.message,
                sousTitre: al.guichet
                  ? `${al.guichet.nom_guichet}${al.guichet.agence?.nom_agence ? ' — ' + al.guichet.agence.nom_agence : ''}`
                  : undefined,
                date: al.date_archivage,
                busy: busyId === `al${al.id}`,
                onRestaurer: () => restaurer(`al${al.id}`, () => desAlerte({ id_alerte: Number(al.id) }), al.message),
              })}
            />
          )}
          {onglet === 'taches' && (
            <ListeArchive
              key="taches"
              items={taches}
              recherche={recherche}
              vide={{ icon: CheckCircle2, title: 'Aucune tâche archivée', description: "Les tâches terminées depuis plus de 6 mois y sont déplacées automatiquement." }}
              render={(t) => ({
                titre: t.titre,
                sousTitre: t.responsable ? `Traitée par ${t.responsable.prenom} ${t.responsable.nom}` : undefined,
                date: t.date_archivage,
                busy: busyId === `t${t.id}`,
                onRestaurer: () => restaurer(`t${t.id}`, () => desTache({ id_tache: Number(t.id) }), t.titre),
              })}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function ListeArchive<T>({
  items,
  recherche,
  vide,
  render,
}: {
  items: T[];
  recherche: string;
  vide: { icon: any; title: string; description: string };
  render: (item: T) => { titre: string; sousTitre?: string; date: any; busy: boolean; onRestaurer: () => void };
}) {
  const rechercheNormalisee = recherche.trim().toLocaleLowerCase('fr-FR');
  const itemsFiltres = items.filter((item) => {
    if (!rechercheNormalisee) return true;
    const { titre, sousTitre } = render(item);
    return `${titre} ${sousTitre ?? ''}`.toLocaleLowerCase('fr-FR').includes(rechercheNormalisee);
  });

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <EmptyState icon={vide.icon} title={vide.title} description={vide.description} />
      </motion.div>
    );
  }

  if (itemsFiltres.length === 0) {
    return <EmptyState icon={Search} title="Aucune archive ne correspond" description="Modifiez votre recherche pour retrouver l’élément archivé." className="py-10" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-2.5"
    >
      {itemsFiltres.map((item: any, i: number) => {
        const { titre, sousTitre, date, busy, onRestaurer } = render(item);
        return (
          <MotionCard
            key={item.id?.toString?.() ?? i}
            interactive={false}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{titre}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {sousTitre && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {sousTitre}
                  </span>
                )}
                <span>Archivé le {formatDate(date)}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRestaurer}
              disabled={busy}
              className="shrink-0"
            >
              <RotateCcw className="size-3.5" />
              {busy ? 'Restauration...' : 'Désarchiver'}
            </Button>
          </MotionCard>
        );
      })}
    </motion.div>
  );
}
