import React, { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  useQuery,
  getCriteresParOperation,
  moveCritereToService,
  removeCritereFromService,
  createCritere,
  deleteCritere,
  duplicateCritere,
} from 'wasp/client/operations';
import { GripVertical, Inbox, Plus, X, Copy, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

// QCM et CASES exigent une liste de choix (voir createCritere côté serveur)
// qu'il n'y a pas la place de saisir proprement dans ce formulaire rapide :
// on ne propose ici que les types utilisables sans configuration
// supplémentaire. Pour QCM/CASES, on renvoie vers « Créer un critère à la
// carte » (formulaire complet, colonne de droite).
const typeReponseOptions: { value: string; label: string }[] = [
  { value: 'SMILEY', label: '⭐ Note / Smileys' },
  { value: 'OUI_NON', label: '👍 Oui / Non' },
  { value: 'ECHELLE', label: '🔢 Échelle (1 à 5 par défaut)' },
  { value: 'TEXTE', label: '✍️ Texte libre' },
];

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
  const [nouveauType, setNouveauType] = useState('SMILEY');
  const [creatingInline, setCreatingInline] = useState(false);
  // Verrous locaux : évitent un double-clic sur Supprimer/Dupliquer pendant
  // que la requête précédente est encore en vol (id du critère concerné).
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [critereASupprimer, setCritereASupprimer] = useState<Critere | null>(null);
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

  // Sur tactile, on attend un appui intentionnel avant le déplacement : le
  // défilement horizontal reste ainsi naturel. La souris garde un démarrage
  // rapide et le clavier dispose du parcours standard de dnd-kit.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setColumns([]);
    setActiveCritere(null);
    setAddingToColumn(null);
  }, [selectedAgenceId]);

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
        type_reponse: nouveauType,
        id_agence: selectedAgenceId,
        serviceIds: col.id_service ? [col.id_service] : undefined,
      });
      setNouvelleQuestion('');
      setNouveauType('SMILEY');
      setAddingToColumn(null);
      toast({ title: 'Question ajoutée', description: `Ajoutée à « ${col.title} ».` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Erreur inconnue' });
    } finally {
      setCreatingInline(false);
    }
  };

  const handleDelete = async (critere: Critere) => {
    if (deletingId) return;
    setCritereASupprimer(critere);
  };

  const confirmerSuppression = async () => {
    const critere = critereASupprimer;
    if (!critere || deletingId) return;
    setDeletingId(critere.id);
    try {
      await deleteCritere({ id_critere: critere.id });
      toast({ title: 'Question supprimée', description: `« ${critere.libelle_critere} » a été supprimée.` });
      setCritereASupprimer(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Suppression impossible', description: err?.message || 'Erreur inconnue' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (critere: Critere) => {
    if (duplicatingId) return;
    setDuplicatingId(critere.id);
    try {
      await duplicateCritere({ id_critere: critere.id });
      toast({ title: 'Question dupliquée', description: `Une copie de « ${critere.libelle_critere} » a été créée.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Duplication impossible', description: err?.message || 'Erreur inconnue' });
    } finally {
      setDuplicatingId(null);
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
    <>
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
          avant que le précédent ait fini d'être persisté côté serveur.
          Bug corrigé : `snap-mandatory` force le navigateur à recaler la
          colonne pile sur un point d'ancrage — or dès qu'on ouvre le champ
          "Nouvelle question" (autoFocus), le clavier virtuel apparaît et le
          navigateur mobile tente AUSSI de faire défiler ce champ dans la
          zone visible. Les deux mécanismes de scroll se disputaient la
          position en même temps : sur téléphone, la colonne repartait
          brusquement sur son point d'ancrage pendant qu'on tapait, donnant
          l'impression que la saisie/l'ajout de question ne faisait rien.
          `snap-proximity` garde le confort du "glisser pour voir la
          colonne suivante" sans jamais forcer un recalage pendant une
          interaction en cours (saisie, focus clavier). */}
      <div
        className={`-mx-1 flex gap-5 overflow-x-auto momentum-scroll scroll-fade-x px-1 pb-4 snap-x snap-proximity transition-opacity ${
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
            nouveauType={nouveauType}
            setNouveauType={setNouveauType}
            onAddQuestion={handleAddQuestion}
            creatingInline={creatingInline}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            deletingId={deletingId}
            duplicatingId={duplicatingId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCritere ? <QuestionCard critere={activeCritere} dragging /> : null}
      </DragOverlay>
    </DndContext>
    <AlertDialog open={critereASupprimer !== null} onOpenChange={(open) => !open && setCritereASupprimer(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Si des clients ont déjà répondu à « {critereASupprimer?.libelle_critere} », la suppression sera refusée ; désactivez-la plutôt depuis la liste des critères.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletingId !== null}>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirmerSuppression} disabled={deletingId !== null}>
            {deletingId !== null ? 'Suppression…' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
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
  nouveauType,
  setNouveauType,
  onAddQuestion,
  creatingInline,
  onDelete,
  onDuplicate,
  deletingId,
  duplicatingId,
}: {
  column: Column;
  columns: Column[];
  onMoveTo: (activeId: number, destKey: string) => void;
  addingToColumn: string | null;
  setAddingToColumn: (key: string | null) => void;
  nouvelleQuestion: string;
  setNouvelleQuestion: (v: string) => void;
  nouveauType: string;
  setNouveauType: (v: string) => void;
  onAddQuestion: (col: Column) => void;
  creatingInline: boolean;
  onDelete: (critere: Critere) => void;
  onDuplicate: (critere: Critere) => void;
  deletingId: number | null;
  duplicatingId: number | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  const isAdding = addingToColumn === column.key;

  return (
    <div
      className="flex w-[85vw] shrink-0 snap-start flex-col rounded-2xl border border-border/70 bg-card-subtle/40 shadow-sm sm:w-[22rem] xl:w-[24rem]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {column.key === UNASSIGNED_KEY && <Inbox className="size-4 shrink-0 text-muted-foreground" />}
          <h3 className="truncate text-sm font-bold text-foreground">{column.title}</h3>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {column.criteres.length}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            // Bug corrigé : nouvelleQuestion/nouveauType sont un état
            // partagé entre toutes les colonnes (un seul formulaire rapide
            // actif à la fois). Sans réinitialisation, un texte tapé dans
            // la colonne A puis un clic sur "+" dans la colonne B faisait
            // apparaître le même texte dans B — on repart toujours d'un
            // champ vide en changeant de colonne.
            setNouvelleQuestion('');
            setNouveauType('SMILEY');
            setAddingToColumn(isAdding ? null : column.key);
          }}
          className="size-7 shrink-0 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
          aria-label={`Ajouter une question à ${column.title}`}
          title="Ajouter une question"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {isAdding && (
        <div className="space-y-1.5 border-b border-border/60 bg-background/60 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={nouvelleQuestion}
              onChange={(e) => setNouvelleQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAddQuestion(column);
                if (e.key === 'Escape') setAddingToColumn(null);
              }}
              placeholder="Nouvelle question..."
              maxLength={300}
              className="h-8 min-w-0 flex-1 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setAddingToColumn(null)}
              className="size-8 shrink-0"
              aria-label="Annuler"
            >
              <X className="size-3.5" />
            </Button>
          </div>
          {/* Type de réponse attendu : demandé dès la création rapide pour
              éviter de devoir repasser par le formulaire complet juste pour
              corriger un type resté par défaut sur "Note / Smileys". */}
          <div className="flex items-center gap-1.5">
            <Select value={nouveauType} onValueChange={setNouveauType}>
              <SelectTrigger className="h-8 min-w-0 flex-1 text-xs" aria-label="Type de réponse attendu">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeReponseOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={creatingInline || !nouvelleQuestion.trim()}
              onClick={() => onAddQuestion(column)}
              className="h-8 shrink-0 text-xs"
            >
              OK
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Besoin d'un QCM ou de cases à cocher ? Utilisez « Créer un critère à la carte »
            (colonne de droite) pour saisir les choix possibles.
          </p>
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
            <SortableQuestionCard
              key={q.id}
              critere={q}
              columns={columns}
              currentKey={column.key}
              onMoveTo={onMoveTo}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              isDeleting={deletingId === q.id}
              isDuplicating={duplicatingId === q.id}
            />
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
  onDelete,
  onDuplicate,
  isDeleting,
  isDuplicating,
}: {
  critere: Critere;
  columns: Column[];
  currentKey: string;
  onMoveTo: (activeId: number, destKey: string) => void;
  onDelete: (critere: Critere) => void;
  onDuplicate: (critere: Critere) => void;
  isDeleting: boolean;
  isDuplicating: boolean;
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
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        isDeleting={isDeleting}
        isDuplicating={isDuplicating}
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
  onDelete,
  onDuplicate,
  isDeleting,
  isDuplicating,
}: {
  critere: Critere;
  dragHandleProps?: any;
  dragging?: boolean;
  columns?: Column[];
  currentKey?: string;
  onMoveTo?: (activeId: number, destKey: string) => void;
  onDelete?: (critere: Critere) => void;
  onDuplicate?: (critere: Critere) => void;
  isDeleting?: boolean;
  isDuplicating?: boolean;
}) {
  return (
    <div
      className={`group flex items-start gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm ${
        dragging ? 'shadow-lg ring-2 ring-primary/40' : ''
      }`}
    >
      {/* Poignée de 44x44px minimum : indispensable au tactile (une cible
          de préhension trop petite est le premier bug de drag & drop
          mobile — le doigt "rate" systématiquement l'élément). */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="-ml-1 -mt-1 size-9 shrink-0 cursor-grab touch-none active:cursor-grabbing"
        {...dragHandleProps}
        aria-label="Réordonner"
      >
        <GripVertical className="size-4" />
      </Button>
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
          <Select value={currentKey} onValueChange={(v) => onMoveTo(critere.id, v)}>
            <SelectTrigger
              className="mt-2 h-7 w-full text-xs font-medium"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Déplacer « ${critere.libelle_critere} » vers une autre opération`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.key === currentKey ? `📍 ${c.title}` : `Déplacer vers : ${c.title}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(onDelete || onDuplicate) && (
          <div className="mt-1.5 flex items-center gap-1">
            {onDuplicate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(critere);
                }}
                disabled={isDuplicating}
                className="h-6 px-1.5 text-[11px] font-medium"
                aria-label={`Dupliquer « ${critere.libelle_critere} »`}
                title="Dupliquer cette question"
              >
                <Copy className="size-3" />
                {isDuplicating ? '...' : 'Dupliquer'}
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(critere);
                }}
                disabled={isDeleting}
                className="h-6 px-1.5 text-[11px] font-medium hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Supprimer « ${critere.libelle_critere} »`}
                title="Supprimer cette question"
              >
                <Trash2 className="size-3" />
                {isDeleting ? '...' : 'Supprimer'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
