import React, { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  useQuery,
  getCriteresParOperation,
  moveCritereToService,
  removeCritereFromService,
  createCritere,
} from 'wasp/client/operations';
import { GripVertical, Inbox, Plus, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

type Critere = {
  id: number;
  libelle_critere: string;
  description?: string | null;
  type_reponse: string;
  actif?: boolean;
};

type Column = {
  key: string; // 'unassigned' ou `service-<id>`
  id_service: number | null;
  title: string;
  criteres: Critere[];
};

const UNASSIGNED_KEY = 'unassigned';

const typeLabel: Record<string, string> = {
  SMILEY: '⭐ Note',
  OUI_NON: '👍 Oui/Non',
  QCM: '📝 QCM',
  TEXTE: '✍️ Texte',
  ECHELLE: '🔢 Échelle',
  CASES: '☑️ Cases',
};

export const QuestionsParOperation = ({ selectedAgenceId }: { selectedAgenceId: number }) => {
  const { data, isLoading, error } = useQuery(getCriteresParOperation, { id_agence: selectedAgenceId }, { enabled: !!selectedAgenceId });
  const { toast } = useToast();

  const [columns, setColumns] = useState<Column[]>([]);
  const [activeCritere, setActiveCritere] = useState<Critere | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [nouvelleQuestion, setNouvelleQuestion] = useState('');
  const [creatingInline, setCreatingInline] = useState(false);
  // Verrou anti-chevauchement : tant qu'un déplacement précédent n'a pas
  // fini d'être persisté côté serveur, on bloque le suivant. Sans ça, deux
  // glissers rapides successifs pourraient partir avec des instantanés
  // (snapshots) de colonnes différents et l'un écraserait le résultat de
  // l'autre au moment de la restauration en cas d'erreur.
  const [isSaving, setIsSaving] = useState(false);

  // Synchronise l'état local (éditable en glisser-déposer) avec les données
  // serveur, sauf pendant un drag en cours (pour ne pas "sauter" sous le doigt).
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    if (isDragging || !data) return;
    const cols: Column[] = [
      {
        key: UNASSIGNED_KEY,
        id_service: null,
        title: 'Non assignées',
        criteres: data.nonAssignees || [],
      },
      ...(data.operations || []).map((op: any) => ({
        key: `service-${op.id}`,
        id_service: op.id,
        title: op.libelle_service,
        criteres: op.criteres || [],
      })),
    ];
    setColumns(cols);
  }, [data, isDragging]);

  // Capteur tactile + souris : distance d'activation de 5px pour ne pas
  // gêner un simple tap sur mobile (sinon chaque appui déclencherait un
  // "drag" fantôme et empêcherait de cliquer normalement sur les cartes).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const findColumnOfCritere = (critereId: number): Column | undefined =>
    columns.find((c) => c.criteres.some((q) => q.id === critereId));

  const findColumnByKey = (key: string): Column | undefined =>
    columns.find((c) => c.key === key);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const id = Number(event.active.id);
    const col = findColumnOfCritere(id);
    setActiveCritere(col?.criteres.find((q) => q.id === id) || null);
  };

  // Logique de déplacement partagée : utilisée à la fois par le
  // glisser-déposer (onDragEnd) et par le sélecteur explicite "Déplacer
  // vers" de chaque carte (voir plus bas). Avant ce correctif, seul le
  // drag-and-drop permettait de changer une question d'opération : sur
  // mobile — et même au clavier/souris sur desktop selon la position —
  // glisser une carte tout en faisant défiler horizontalement la rangée
  // de colonnes en même temps est un geste que beaucoup d'utilisateurs
  // n'arrivent pas à réaliser correctement (surtout pour aller de la
  // première à la dernière colonne, hors écran). Le sélecteur offre un
  // chemin garanti, en un clic, qui ne dépend d'aucun geste de glissement.
  const moveCritereTo = async (
    activeId: number,
    destKey: string,
    destIndexOverride?: number,
  ) => {
    if (isSaving) return;

    const sourceCol = findColumnOfCritere(activeId);
    if (!sourceCol) return;
    const destCol = findColumnByKey(destKey);
    if (!destCol) return;

    const sourceIndex = sourceCol.criteres.findIndex((q) => q.id === activeId);
    const destIndex = destIndexOverride ?? destCol.criteres.length;

    if (sourceCol.key === destCol.key && sourceIndex === destIndex) return;

    const snapshotAvantMutation = columns;

    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, criteres: [...c.criteres] }));
      const src = next.find((c) => c.key === sourceCol.key)!;
      const dst = next.find((c) => c.key === destCol.key)!;
      if (src.key === dst.key) {
        src.criteres = arrayMove(src.criteres, sourceIndex, destIndex);
      } else {
        const [moved] = src.criteres.splice(sourceIndex, 1);
        dst.criteres.splice(destIndex, 0, moved);
      }
      return next;
    });

    setIsSaving(true);
    try {
      if (destCol.key === UNASSIGNED_KEY) {
        if (sourceCol.key !== UNASSIGNED_KEY && sourceCol.id_service) {
          await removeCritereFromService({ id_critere: activeId, id_service: sourceCol.id_service });
        }
      } else if (destCol.id_service) {
        await moveCritereToService({
          id_critere: activeId,
          id_service: destCol.id_service,
          ordre: destIndex,
        });
      }
    } catch (err: any) {
      setColumns(snapshotAvantMutation);
      toast({
        variant: 'destructive',
        title: 'Erreur lors du déplacement',
        description: err?.message || 'La question a été replacée à sa position précédente. Réessayez.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    setActiveCritere(null);
    const { active, over } = event;
    if (!over) return;

    // Ignore un nouveau lâcher tant que le précédent n'a pas fini d'être
    // persisté : évite que deux instantanés (snapshots) de restauration se
    // chevauchent et s'écrasent mutuellement en cas d'erreur.
    if (isSaving) return;

    const activeId = Number(active.id);
    const sourceCol = findColumnOfCritere(activeId);
    if (!sourceCol) return;

    // La cible peut être une carte (over.id = id de critère) ou une colonne
    // vide (over.id = clé de colonne, ex. "service-3").
    const overIsColumn = columns.some((c) => c.key === over.id);
    const destCol = overIsColumn ? findColumnByKey(String(over.id)) : findColumnOfCritere(Number(over.id));
    if (!destCol) return;

    const destIndex = overIsColumn
      ? destCol.criteres.length
      : destCol.criteres.findIndex((q) => q.id === Number(over.id));

    await moveCritereTo(activeId, destCol.key, destIndex);
  };

  const handleAddQuestion = async (col: Column) => {
    const libelle = nouvelleQuestion.trim();
    if (!libelle || creatingInline) return;
    if (libelle.length > 300) {
      toast({ variant: 'destructive', title: 'Libellé trop long', description: 'Maximum 300 caractères.' });
      return;
    }
    setCreatingInline(true);
    try {
      await createCritere({
        libelle_critere: libelle,
        id_agence: selectedAgenceId,
        serviceIds: col.id_service ? [col.id_service] : undefined,
      });
      setNouvelleQuestion('');
      setAddingToColumn(null);
      toast({ title: 'Question ajoutée', description: `Ajoutée à « ${col.title} ».` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Erreur inconnue' });
    } finally {
      setCreatingInline(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto momentum-scroll scroll-fade-x pb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-64 w-64 shrink-0 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur de chargement des questions par opération.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setIsDragging(false);
        setActiveCritere(null);
      }}
      // Seuil abaissé (20% au lieu des ~50% par défaut) : sur une rangée de
      // colonnes qui défile horizontalement, le curseur/doigt doit pouvoir
      // déclencher le défilement automatique dès qu'il approche du bord,
      // sans avoir à aller le coller complètement contre le bord de l'écran.
      autoScroll={{ threshold: { x: 0.2, y: 0.2 } }}
    >
      {/* Scroll horizontal : sur mobile, on glisse le doigt latéralement
          pour voir toutes les opérations plutôt que de tout écraser dans
          une seule colonne illisible. pointer-events-none pendant la
          sauvegarde : empêche physiquement un second drag de démarrer
          avant que le précédent ait fini d'être persisté côté serveur. */}
      <div
        className={`-mx-1 flex gap-4 overflow-x-auto momentum-scroll scroll-fade-x px-1 pb-3 snap-x snap-mandatory transition-opacity sm:snap-none ${
          isSaving ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        {columns.map((col) => (
          <ColumnView
            key={col.key}
            column={col}
            columns={columns}
            onMoveTo={moveCritereTo}
            addingToColumn={addingToColumn}
            setAddingToColumn={setAddingToColumn}
            nouvelleQuestion={nouvelleQuestion}
            setNouvelleQuestion={setNouvelleQuestion}
            onAddQuestion={handleAddQuestion}
            creatingInline={creatingInline}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCritere ? <QuestionCard critere={activeCritere} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
};

function ColumnView({
  column,
  columns,
  onMoveTo,
  addingToColumn,
  setAddingToColumn,
  nouvelleQuestion,
  setNouvelleQuestion,
  onAddQuestion,
  creatingInline,
}: {
  column: Column;
  columns: Column[];
  onMoveTo: (activeId: number, destKey: string) => void;
  addingToColumn: string | null;
  setAddingToColumn: (key: string | null) => void;
  nouvelleQuestion: string;
  setNouvelleQuestion: (v: string) => void;
  onAddQuestion: (col: Column) => void;
  creatingInline: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  const isAdding = addingToColumn === column.key;

  return (
    <div
      className="flex w-[85vw] shrink-0 snap-start flex-col rounded-2xl border border-border/70 bg-card-subtle/40 sm:w-72"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {column.key === UNASSIGNED_KEY && <Inbox className="size-4 shrink-0 text-muted-foreground" />}
          <h3 className="truncate text-sm font-bold text-foreground">{column.title}</h3>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {column.criteres.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAddingToColumn(isAdding ? null : column.key)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          aria-label={`Ajouter une question à ${column.title}`}
          title="Ajouter une question"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {isAdding && (
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-background/60 px-3 py-2">
          <input
            autoFocus
            value={nouvelleQuestion}
            onChange={(e) => setNouvelleQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAddQuestion(column);
              if (e.key === 'Escape') setAddingToColumn(null);
            }}
            placeholder="Nouvelle question..."
            maxLength={300}
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            disabled={creatingInline || !nouvelleQuestion.trim()}
            onClick={() => onAddQuestion(column)}
            className="shrink-0 rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setAddingToColumn(null)}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Annuler"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 p-3 transition-colors ${
          isOver ? 'bg-primary/5' : ''
        }`}
      >
        <SortableContext items={column.criteres.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {column.criteres.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Glissez une question ici
            </p>
          )}
          {column.criteres.map((q) => (
            <SortableQuestionCard key={q.id} critere={q} columns={columns} currentKey={column.key} onMoveTo={onMoveTo} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableQuestionCard({
  critere,
  columns,
  currentKey,
  onMoveTo,
}: {
  critere: Critere;
  columns: Column[];
  currentKey: string;
  onMoveTo: (activeId: number, destKey: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: critere.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionCard
        critere={critere}
        dragHandleProps={{ ...attributes, ...listeners }}
        columns={columns}
        currentKey={currentKey}
        onMoveTo={onMoveTo}
      />
    </div>
  );
}

function QuestionCard({
  critere,
  dragHandleProps,
  dragging,
  columns,
  currentKey,
  onMoveTo,
}: {
  critere: Critere;
  dragHandleProps?: any;
  dragging?: boolean;
  columns?: Column[];
  currentKey?: string;
  onMoveTo?: (activeId: number, destKey: string) => void;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm ${
        dragging ? 'shadow-lg ring-2 ring-primary/40' : ''
      }`}
    >
      {/* Poignée de 44x44px minimum : indispensable au tactile (une cible
          de préhension trop petite est le premier bug de drag & drop
          mobile — le doigt "rate" systématiquement l'élément). */}
      <button
        type="button"
        className="-ml-1 -mt-1 flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground active:cursor-grabbing hover:bg-muted"
        {...dragHandleProps}
        aria-label="Réordonner"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm font-semibold leading-snug text-foreground break-words">
          {critere.libelle_critere}
        </p>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {typeLabel[critere.type_reponse] || critere.type_reponse}
          </span>
          {critere.actif === false && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Désactivé
            </span>
          )}
        </div>
        {/* Alternative garantie au glisser-déposer : déplacer une question
            de la première à la dernière opération obligeait à faire
            défiler la rangée ET glisser en même temps — un geste que
            beaucoup n'arrivaient pas à réaliser (mobile ET desktop). Ce
            sélecteur déplace la question en un clic, sans aucun glisser. */}
        {columns && currentKey && onMoveTo && (
          <select
            value={currentKey}
            onChange={(e) => onMoveTo(critere.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Déplacer « ${critere.libelle_critere} » vers une autre opération`}
            className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:ring-1 focus:ring-ring"
          >
            {columns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.key === currentKey ? `📍 ${c.title}` : `Déplacer vers : ${c.title}`}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
