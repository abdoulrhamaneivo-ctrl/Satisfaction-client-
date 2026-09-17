// src/client/components/RapportReseauPrint.tsx
// ============================================================================
// Rapport réseau DIRECTION (impression PDF) : 100 % agrégats, ZÉRO verbatim.
// Synthèse une page : KPIs + deltas, santé par agence (avec tendances),
// incidents en cours, thèmes IA. Le rapport mensuel par agence reste
// RapportMensuelPrint (chefs). Styles inline purs pour l'impression.
// ============================================================================
import React from 'react';

export type AgenceReseauLigne = {
  nom_agence: string;
  commune?: string | null;
  nb_avis: number;
  score_moyen: number | null;
  taux_satisfaction: number | null;
  delta_note?: number | null;
};

export interface RapportReseauProps {
  entrepriseName: string;
  periodeLabel: string;
  dateDebut: Date;
  dateFin: Date;
  satisfaction: number;
  noteMoyenne: number;
  totalAvis: number;
  deltaSatisfaction: number;
  deltaNote: number;
  deltaVolume: number;
  moyenneGlobale: number | null;
  meilleureAgence: string | null;
  agenceASurveiller: string | null;
  agences: AgenceReseauLigne[];
  alertesNouvelles: number;
  tachesEnCours: number;
  themes: { theme: string; count: number }[];
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const RapportReseauPrint = React.forwardRef<HTMLDivElement, RapportReseauProps>((props, ref) => {
  const {
    entrepriseName, periodeLabel, dateDebut, dateFin,
    satisfaction, noteMoyenne, totalAvis,
    deltaSatisfaction, deltaNote, deltaVolume,
    moyenneGlobale, meilleureAgence, agenceASurveiller, agences,
    alertesNouvelles, tachesEnCours, themes,
  } = props;

  const kpi = (label: string, valeur: string, delta?: number, uniteDelta = '') => (
    <div style={{ flex: 1, border: '1px solid #E9ECEF', borderRadius: 12, padding: '12px 14px', minWidth: 0 }}>
      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6C757D', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, color: '#111', margin: '4px 0 0' }}>{valeur}</p>
      {delta !== undefined && (
        <p style={{ fontSize: 10, fontWeight: 700, color: delta >= 0 ? '#198754' : '#DC3545', margin: '2px 0 0' }}>
          {delta >= 0 ? '▲ +' : '▼ '}{delta}{uniteDelta} vs période précédente
        </p>
      )}
    </div>
  );

  return (
    <div ref={ref} style={{ fontFamily: 'system-ui, sans-serif', color: '#111', background: 'white', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f2240', paddingBottom: 12 }}>
        <div>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#0f2240', margin: 0 }}>{entrepriseName}</p>
          <p style={{ fontSize: 11, color: '#6C757D', margin: '4px 0 0' }}>
            Rapport réseau — {periodeLabel} · du {fmtDate(dateDebut)} au {fmtDate(dateFin)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, color: '#6C757D', margin: 0 }}>Généré le {fmtDate(new Date())}</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#c47a20', margin: '2px 0 0' }}>CONFIDENTIEL — DIRECTION</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {kpi('Satisfaction', `${satisfaction.toFixed(0)}%`, deltaSatisfaction, ' pts')}
        {kpi('Note moyenne', `${noteMoyenne.toFixed(1)}/5`, deltaNote)}
        {kpi('Volume avis', String(totalAvis), deltaVolume, ' %')}
        {kpi('Alertes / Tâches', `${alertesNouvelles} / ${tachesEnCours}`)}
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '20px 0 8px' }}>
        Santé par agence{moyenneGlobale !== null ? ` — moyenne réseau ${moyenneGlobale}/5` : ''}
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#0f2240', color: 'white' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Agence</th>
            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Avis</th>
            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Note</th>
            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Tendance</th>
            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Satisfaits</th>
          </tr>
        </thead>
        <tbody>
          {agences.map((a) => (
            <tr key={a.nom_agence} style={{ borderBottom: '1px solid #E9ECEF' }}>
              <td style={{ padding: '6px 8px', fontWeight: 700 }}>
                {a.nom_agence}
                {meilleureAgence === a.nom_agence && a.nb_avis > 0 ? ' ★' : ''}
                {agenceASurveiller === a.nom_agence && a.nb_avis > 0 ? ' ⚠' : ''}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{a.nb_avis}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{a.score_moyen !== null ? `${a.score_moyen}/5` : '—'}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: (a.delta_note ?? 0) >= 0 ? '#198754' : '#DC3545' }}>
                {a.delta_note !== null && a.delta_note !== undefined ? `${a.delta_note >= 0 ? '+' : ''}${a.delta_note}` : '—'}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{a.taux_satisfaction !== null ? `${a.taux_satisfaction}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {themes.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '20px 0 8px' }}>Thèmes récurrents</h2>
          <p style={{ fontSize: 11, color: '#343A40' }}>
            {themes.slice(0, 8).map((t) => `${t.theme} (${t.count})`).join(' · ')}
          </p>
        </>
      )}

      <footer style={{ marginTop: 20, borderTop: '1px solid #E9ECEF', paddingTop: 8 }}>
        <p style={{ fontSize: 8.5, color: '#6C757D', textAlign: 'center', margin: 0 }}>
          Document généré par {entrepriseName} — données confidentielles, usage interne Direction. Conforme loi n°2013-450 (ARTCI).
        </p>
      </footer>
    </div>
  );
});
