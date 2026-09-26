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
import { reponseEnClair, reponseEstPositive, libelleOuiNon } from '../../shared/libelleReponse';
import { scoreNormaliseSur5Client } from '../utils';
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
        // Vague 2 : identité des options cochées (source unique). Repli legacy :
        // les libellés sont déjà stockés dans le commentaire, séparés par « • ».
        const choisis = (r.optionsChoisies ?? [])
            .map((co) => String(co?.option?.libelle ?? '').trim())
            .filter(Boolean);
        const source = choisis.length > 0
            ? choisis
            : (texteSpecifique || (texte && !groupe ? texte : null) || texte)
                .split('•')
                .map((s) => s.trim())
                .filter(Boolean);
        const choix = source;
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
        // Vague 2 : l'identité de l'option. Plus de `options[score - 1]`, qui
        // pouvait nommer la MAUVAISE option quand le score n'était pas le rang.
        const label = reponseEnClair(r, { texteGroupe: groupe }) ?? 'Réponse non restituable';
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
        // Vague 2 : le sens vient de l'ORIENTATION du critère. L'ancien
        // `score_brut >= 4` affichait « Non » pour un « Oui » sur une question
        // négative (« Avez-vous rencontré un problème ? »).
        const oui = libelleOuiNon(r);
        const positif = reponseEstPositive(r) ?? oui === 'Oui';
        return (<li className={coquille} title={libelle}>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${positif ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`} aria-hidden>
          {positif ? <ThumbsUp className="size-4"/> : <ThumbsDown className="size-4"/>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-foreground">{libelle}</span>
          <span className={`text-sm font-black ${positif ? 'text-success' : 'text-destructive'}`}>
            {oui ?? 'Réponse non restituable'}
          </span>
        </span>
      </li>);
    }
    // ── ÉCHELLE : note normalisée sur 5 + valeur brute sur son échelle ───────
    if (type === 'ECHELLE') {
        // Vague 2 : la normalisation passe par la règle partagée, qui lit
        // `score_normalise` en priorité (le CES et le NPS ne sont donc plus
        // retournés). Un effort élevé ne doit JAMAIS ressembler à une bonne note.
        const brut = Number(r.score_officiel ?? r.score_brut);
        const normalisee = scoreNormaliseSur5Client(r) ?? (Number.isFinite(brut) ? brut : 0);
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
          {Number.isFinite(brut) ? brut : '—'}
          <span className="text-[11px] font-semibold text-muted-foreground">/{max}</span>
        </span>
      </li>);
    }
    // ── SMILEY (défaut) : vraie note sur 5 ───────────────────────────────────
    //
    // Vague 6 : cette branche lisait `r.score_brut` — la colonne HÉRITÉE,
    // explicitly nullable — alors que la branche ECHELLE ci-dessus résout
    // déjà la note canonique, avec un commentaire qui explique pourquoi.
    // Les deux branches n'étaient donc pas d'accord sur la source.
    //
    // Conséquence réelle : sur une ligne où `score_brut` est NULL mais
    // `score_officiel` renseigné, `visuelPourNote(null)` renvoie la
    // NOTE 1 — un client ayant mis 4/5 s'affichait avec une étoile et une
    // barre à 0/5. Le chemin d'affichage reprenait donc la colonne que la
    // migration a explicitement marquée « legacy ».
    //
    // On applique partout la même règle que pour l'Echelle et que le reste
    // de l'application : `score_normalise` (canonique) d'abord, puis
    // `score_officiel`, et seulement en dernier recours `score_brut`.
    const noteCanonique = scoreNormaliseSur5Client(r);
    const noteAffichee = noteCanonique ?? Number(r.score_officiel ?? r.score_brut);
    return (<li className={coquille} title={libelle}>
      <span className="text-2xl leading-none" aria-hidden>
        {Number.isFinite(noteAffichee) ? visuelPourNote(noteAffichee).icon : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-foreground">{libelle}</span>
        <BarreNote score={Number.isFinite(noteAffichee) ? noteAffichee : 0}/>
      </span>
      <span className="shrink-0 text-sm font-bold text-foreground font-satoshi">
        {Number.isFinite(noteAffichee) ? noteAffichee : '—'}
        <span className="text-[11px] font-semibold text-muted-foreground">/5</span>
      </span>
    </li>);
};
//# sourceMappingURL=LigneReponse.jsx.map