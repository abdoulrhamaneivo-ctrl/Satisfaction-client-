// src/client/components/EditeurOptions.tsx
// ============================================================================
// Éditeur de choix QCM/CASES (vague 1) : libellé + note explicite 1-10
// (Auto = inférence lexicale) + poids (CASES pondéré) + code métier.
// La note ne dépend JAMAIS de l'ordre des lignes (rappel affiché).
// ============================================================================
import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from './ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { nouvelleCleOption, } from '../criteres/optionsForm';
export const EditeurOptions = ({ options, onChange, pondere }) => {
    const set = (cle, patch) => {
        onChange(options.map((o) => (o.cle === cle ? { ...o, ...patch } : o)));
    };
    const ajouter = () => {
        onChange([...options, { cle: nouvelleCleOption(), libelle: '', score: null, poids: null, code_metier: '' }]);
    };
    const retirer = (cle) => {
        if (options.length <= 2)
            return; // minimum serveur : 2 choix
        onChange(options.filter((o) => o.cle !== cle));
    };
    return (<div className="space-y-2">
      <div className="rounded-xl border border-info/25 bg-info/5 p-2.5 text-[11px] font-medium text-info">
        La note ne dépend jamais de l'ordre des lignes : seule la colonne « Note » compte
        (Auto = déduite du libellé). Réordonner ne change aucun score.
      </div>
      {options.map((o, i) => (<div key={o.cle} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-center text-xs font-black text-muted-foreground">{i + 1}</span>
          <Input value={o.libelle} onChange={(e) => set(o.cle, { libelle: e.target.value })} placeholder={`Choix ${i + 1}`} aria-label={`Libellé du choix ${i + 1}`} className="h-10 flex-1 text-sm"/>
          <Select value={o.score === null ? 'auto' : String(o.score)} onValueChange={(v) => set(o.cle, { score: v === 'auto' ? null : Number(v) })}>
            <SelectTrigger className="h-10 w-[92px] shrink-0 text-xs" aria-label={`Note du choix ${i + 1}`}>
              <SelectValue placeholder="Note"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
            </SelectContent>
          </Select>
          {pondere && (<Input type="number" value={o.poids ?? ''} onChange={(e) => set(o.cle, { poids: e.target.value === '' ? null : Number(e.target.value) })} placeholder="±" title="Poids (−100 à +100) : ex. −25. Base 100 + somme, borné 0-100." aria-label={`Poids du choix ${i + 1}`} className="h-10 w-[72px] shrink-0 text-sm"/>)}
          <Input value={o.code_metier} onChange={(e) => set(o.cle, { code_metier: e.target.value })} placeholder="Code" title="Code métier (ex. EXCLUSIF pour « Aucun problème », incompatible avec tout autre choix)." aria-label={`Code métier du choix ${i + 1}`} className="h-10 w-[92px] shrink-0 text-xs uppercase"/>
          <Button type="button" variant="ghost" size="icon" onClick={() => retirer(o.cle)} disabled={options.length <= 2} aria-label={`Retirer le choix ${i + 1}`} className="min-h-10 min-w-10 shrink-0 hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="size-4"/>
          </Button>
        </div>))}
      <Button type="button" variant="outline" size="sm" onClick={ajouter} className="font-bold">
        <Plus className="size-4 mr-1"/> Ajouter un choix
      </Button>
    </div>);
};
//# sourceMappingURL=EditeurOptions.jsx.map