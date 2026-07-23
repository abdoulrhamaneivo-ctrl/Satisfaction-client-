import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from 'wasp/client/auth';
import { useQuery, getRechercheGlobale } from 'wasp/client/operations';
import {
  Search,
  LayoutDashboard,
  Store,
  Calendar,
  Building2,
  MessageSquare,
  AlertTriangle,
  ListChecks,
  Users2,
  User,
  MapPin,
  Loader2,
  CornerDownLeft,
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { cn } from '../utils';
import { Button } from './ui/button';
import { Input } from './ui/input';

// Actions de navigation statiques — même liste que la barre de navigation
// (voir NavBar/constants.ts), reformatée pour la recherche : un seul niveau
// à plat, avec les mêmes règles de rôle pour ne pas proposer une page à
// laquelle l'utilisateur n'a pas accès.
type ActionNavigation = {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
};

const ACTIONS_NAVIGATION: ActionNavigation[] = [
  { id: 'nav-dashboard', label: 'Tableau de bord', to: '/dashboard', icon: LayoutDashboard },
  { id: 'nav-guichets', label: 'Guichets', to: '/guichets', icon: Store },
  { id: 'nav-planning', label: 'Planning', to: '/planning', icon: Calendar },
  { id: 'nav-agences', label: 'Agences', to: '/admin/agences', icon: Building2, roles: ['DIRECTION'] },
  { id: 'nav-avis', label: 'Avis clients', to: '/avis', icon: MessageSquare },
  { id: 'nav-alertes', label: 'Alertes & Tâches', to: '/alertes-taches', icon: AlertTriangle },
  { id: 'nav-criteres', label: 'Critères', to: '/criteres', icon: ListChecks },
  { id: 'nav-personnel', label: 'Personnel', to: '/admin/personnel', icon: Users2, roles: ['DIRECTION', 'CHEF_AGENCE'] },
];

type ResultatItem = {
  id: string;
  label: string;
  sublabel?: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function CommandPalette() {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState('');
  const [indexActif, setIndexActif] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const canManageDirectory = ['DIRECTION', 'CHEF_AGENCE'].includes(user?.role ?? '');
  const canManageAgencies = user?.role === 'DIRECTION';

  const requeteDebattue = useDebounce(requete, 250);
  const rechercheActive = requeteDebattue.trim().length >= 2;

  const { data: resultats, isLoading: chargement } = useQuery(
    getRechercheGlobale,
    { q: requeteDebattue },
    { enabled: rechercheActive }
  );

  // Ctrl+K / Cmd+K ouvre la palette depuis n'importe où dans l'app. On écoute
  // aussi un évènement custom pour permettre au bouton de la NavBar de
  // l'ouvrir sans avoir à faire remonter l'état via des props (la palette
  // est montée une seule fois, au niveau de App.tsx).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOuvert((v) => !v);
      }
      if (e.key === 'Escape') {
        setOuvert(false);
      }
    };
    const onOpenEvent = () => setOuvert(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('yeba:open-command-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('yeba:open-command-palette', onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (ouvert) {
      setRequete('');
      setIndexActif(0);
      // Laisse le temps au DOM de monter avant de focus.
      setTimeout(() => inputRef.current?.focus(), 10);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [ouvert]);

  const actionsFiltrees = useMemo(() => {
    const q = requete.trim().toLowerCase();
    return ACTIONS_NAVIGATION.filter((a) => {
      if (a.roles && !a.roles.includes(user?.role ?? '')) return false;
      if (q.length === 0) return true;
      return a.label.toLowerCase().includes(q);
    });
  }, [requete, user?.role]);

  // Regroupe navigation + résultats de recherche dans une seule liste plate,
  // pour que les flèches haut/bas et Entrée naviguent uniformément entre
  // les groupes sans logique séparée.
  const groupes = useMemo(() => {
    const liste: { titre: string; items: ResultatItem[] }[] = [];

    if (actionsFiltrees.length > 0) {
      liste.push({
        titre: 'Navigation',
        items: actionsFiltrees.map((a) => ({ id: a.id, label: a.label, to: a.to, icon: a.icon })),
      });
    }

    if (rechercheActive && resultats) {
      if (canManageAgencies && resultats.agences?.length > 0) {
        liste.push({
          titre: 'Agences',
          items: resultats.agences.map((a: any) => ({
            id: `agence-${a.id}`,
            label: a.nom_agence,
            sublabel: a.commune,
            to: '/admin/agences',
            icon: Building2,
          })),
        });
      }
      if (resultats.guichets?.length > 0) {
        liste.push({
          titre: 'Guichets',
          items: resultats.guichets.map((g: any) => ({
            id: `guichet-${g.id}`,
            label: g.nom_guichet,
            sublabel: g.nom_agence ?? undefined,
            to: '/guichets',
            icon: MapPin,
          })),
        });
      }
      if (canManageDirectory && resultats.agents?.length > 0) {
        liste.push({
          titre: 'Agents',
          items: resultats.agents.map((ag: any) => ({
            id: `agent-${ag.id}`,
            label: `${ag.prenom ?? ''} ${ag.nom ?? ''}`.trim() || 'Agent',
            to: '/admin/personnel',
            icon: User,
          })),
        });
      }
      if (resultats.avis?.length > 0) {
        liste.push({
          titre: 'Avis clients',
          items: resultats.avis.map((r: any) => ({
            id: `avis-${r.id}`,
            label: r.commentaire_texte?.slice(0, 60) || `Avis ${r.score_brut}/5`,
            sublabel: r.guichet ? `${r.guichet} · ${r.score_brut}/5` : `${r.score_brut}/5`,
            to: '/avis',
            icon: MessageSquare,
          })),
        });
      }
    }

    return liste;
  }, [actionsFiltrees, rechercheActive, resultats, canManageAgencies, canManageDirectory]);

  const itemsPlats = useMemo(() => groupes.flatMap((g) => g.items), [groupes]);

  useEffect(() => {
    setIndexActif(0);
  }, [itemsPlats.length]);

  const selectionner = (item: ResultatItem) => {
    setOuvert(false);
    navigate(item.to);
  };

  const onKeyDownListe = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndexActif((i) => Math.min(i + 1, itemsPlats.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndexActif((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = itemsPlats[indexActif];
      if (item) selectionner(item);
    }
  };

  if (!ouvert) return null;

  let compteurGlobal = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" role="dialog" aria-modal="true" aria-label="Recherche globale">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOuvert(false)}
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={onKeyDownListe}
            placeholder="Rechercher une page, une agence, un guichet, un agent, un avis…"
            className="h-auto w-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
          {chargement && rechercheActive && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
          <kbd className="hidden shrink-0 rounded border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            Échap
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {groupes.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {rechercheActive ? 'Aucun résultat.' : 'Tapez au moins 2 caractères pour chercher dans les avis, agences, guichets et agents.'}
            </div>
          )}

          {groupes.map((groupe) => (
            <div key={groupe.titre} className="mb-1 last:mb-0">
              <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {groupe.titre}
              </div>
              {groupe.items.map((item) => {
                compteurGlobal += 1;
                const actif = compteurGlobal === indexActif;
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    onMouseEnter={() => setIndexActif(compteurGlobal)}
                    onClick={() => selectionner(item)}
                    className={cn(
                      'h-auto w-full justify-start gap-3 rounded-none px-4 py-2.5 text-left text-sm font-normal',
                      actif ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/60'
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.sublabel && (
                      <span className="shrink-0 truncate text-xs text-muted-foreground">{item.sublabel}</span>
                    )}
                    {actif && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bouton compact à placer dans la NavBar : ouvre la même palette au clic
// (entrée "souris" pour la recherche globale, en plus du raccourci clavier).
export function CommandPaletteTrigger() {
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform ?? navigator.userAgent);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.dispatchEvent(new Event('yeba:open-command-palette'))}
      className="h-auto gap-2 rounded-full border-border/70 bg-card-subtle/60 px-3 py-1.5 text-xs font-normal text-muted-foreground hover:bg-muted/60"
    >
      <Search className="size-3.5" />
      <span className="hidden sm:inline">Rechercher…</span>
      <kbd className="hidden rounded border border-border/70 bg-card px-1 py-0.5 text-[10px] sm:inline">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </Button>
  );
}
