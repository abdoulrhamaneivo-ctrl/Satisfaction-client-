// src/client/components/LigneReponse.tsx
// ============================================================================
// UNE ligne de réponse dans la lecture d'un avis — affichée SELON LE TYPE de
// la question, jamais en fausse note sur 5 :
// - SMILEY / ECHELLE : vraie note (barre + X/5, échelle normalisée) ;
// - OUI_NON : badge Oui / Non (le 5/1 stocké n'est qu'un encodage) ;
// - QCM : le libellé de l'option choisie (jamais un index X/5) ;
// - CASES : les choix sous forme de chips ;
// - TEXTE : le texte verbatim cité (jamais le score neutre 3).
// Un avis, ce n'est pas que des notes : le texte du client est la donnée.
// ============================================================================
import React from 'react';
import { MessageSquareText, ListChecks, Tags, ThumbsUp, ThumbsDown, Hash } from 'lucide-react';
import { visuelPourNote, BarreNote } from './NoteVisuel';
export function optionQCMParIndex(optionsReponse, score) {
    const options = String(optionsReponse || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    return options[score - 1] ?? null;
}
const normaliserEchelle = (score, optionsReponse) => {
    const [a, b] = String(optionsReponse || '1,5').split(',');
    const min = Number(a) || 1;
    const max = Number(b) || 5;
    if (!(max > min))
        return score;
    return Math.max(1, Math.min(5, 1 + ((score - min) / (max - min)) * 4));
};
const coquille = 'flex items-start gap-3 rounded-xl border border-border/40 bg-background px-3 py-2.5';
export const LigneReponse = ({ r, texteGroupe }) => {
    const type = r.critere?.type_reponse;
    const libelle = r.critere?.libelle_critere || 'Critère';
    const texte = String(r.commentaire_texte || '').trim();
    const groupe = String(texteGroupe || '').trim();
    // Texte PROPRE à cette question : s'il est identique au commentaire global
    // de l'avis, inutile de le répéter ici (il est cité plus bas).
    const texteSpecifique = texte && texte !== groupe ? texte : null;
    // ── TEXTE LIBRE : la parole du client, verbatim ──────────────────────────
    if (type === 'TEXTE') {
        if (!texte)
            return null;
        if (!texteSpecifique)
            return null; // déjà cité dans le commentaire global
        return (<li className={`${coquille} flex-col !items-stretch gap-1.5`}>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          <MessageSquareText className="size-3.5"/> {libelle} — réponse libre
        </span>
        <span className="text-sm font-medium leading-relaxed text-foreground">“{texteSpecifique}”</span>
      </li>);
    }
    // ── CASES À COCHER : les choix sous forme de chips ───────────────────────
    if (type === 'CASES') {
        const source = texteSpecifique || (texte && !groupe ? texte : null) || texte;
        const choix = source ? source.split('•').map((s) => s.trim()).filter(Boolean) : [];
        if (choix.length === 0)
            return null;
        return (<li className={`${coquille} flex-col !items-stretch gap-1.5`}>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Tags className="size-3.5"/> {libelle}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {choix.map((c, i) => (<span key={i} className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              {c}
            </span>))}
        </span>
      </li>);
    }
    // ── QCM : le libellé choisi (jamais un index X/5) ────────────────────────
    if (type === 'QCM') {
        const label = texteSpecifique || optionQCMParIndex(r.critere?.options_reponse, r.score_brut) || `Option n°${r.score_brut}`;
        return (<li className={coquille} title={libelle}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
          <ListChecks className="size-4"/>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-foreground">{libelle}</span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-primary">{label}</span>
        </span>
      </li>);
    }
    // ── OUI / NON : le 5 et le 1 stockés ne sont qu'un encodage ─────────────
    if (type === 'OUI_NON') {
        const oui = r.score_brut >= 4;
        return (<li className={coquille} title={libelle}>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${oui ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`} aria-hidden>
          {oui ? <ThumbsUp className="size-4"/> : <ThumbsDown className="size-4"/>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-foreground">{libelle}</span>
          <span className={`text-sm font-black ${oui ? 'text-success' : 'text-destructive'}`}>
            {oui ? 'Oui' : 'Non'}
          </span>
        </span>
      </li>);
    }
    // ── ÉCHELLE : note normalisée sur 5 + valeur brute sur son échelle ───────
    if (type === 'ECHELLE') {
        const normalisee = normaliserEchelle(r.score_brut, r.critere?.options_reponse);
        const [a, b] = String(r.critere?.options_reponse || '1,5').split(',');
        const max = Number(b) || 5;
        return (<li className={coquille} title={libelle}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
          <Hash className="size-4"/>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-foreground">{libelle}</span>
          <BarreNote score={normalisee}/>
        </span>
        <span className="shrink-0 text-sm font-bold text-foreground font-satoshi">
          {r.score_brut}<span className="text-[11px] font-semibold text-muted-foreground">/{max}</span>
        </span>
      </li>);
    }
    // ── SMILEY (défaut) : vraie note sur 5 ───────────────────────────────────
    return (<li className={coquille} title={libelle}>
      <span className="text-2xl leading-none" aria-hidden>
        {visuelPourNote(r.score_brut).icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-foreground">{libelle}</span>
        <BarreNote score={r.score_brut}/>
      </span>
      <span className="shrink-0 text-sm font-bold text-foreground font-satoshi">
        {r.score_brut}<span className="text-[11px] font-semibold text-muted-foreground">/5</span>
      </span>
    </li>);
};
//# sourceMappingURL=LigneReponse.jsx.map