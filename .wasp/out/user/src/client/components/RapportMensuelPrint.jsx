import React from 'react';
import { regrouperAvisParSoumission } from '../utils';
// ---------- Helpers impression (CSS pur, zéro canvas/SVG — lisible à 100% sur papier) ----------
function BarreNote({ note, max = 5 }) {
    const pct = Math.max(0, Math.min(100, (note / max) * 100));
    const couleur = note >= 4 ? '#198754' : note >= 3 ? '#F59E0B' : '#DC3545';
    return (<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 10, background: '#E9ECEF', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: couleur, borderRadius: 5 }}/>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#111', minWidth: 36, textAlign: 'right' }}>
        {note.toFixed(2)}/5
      </span>
    </div>);
}
function Indicateur({ label, valeur, detail }) {
    return (<div style={{ border: '1px solid #E9ECEF', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6C757D' }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#111', lineHeight: 1.15, marginTop: 4 }}>{valeur}</div>
      {detail ? <div style={{ fontSize: 10, color: '#6C757D', marginTop: 2 }}>{detail}</div> : null}
    </div>);
}
function SectionTitre({ children }) {
    return (<h3 style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#00843D',
            borderBottom: '2px solid #00843D',
            paddingBottom: 4,
            marginBottom: 10,
        }}>
      {children}
    </h3>);
}
function Liseré() {
    return (<div style={{
            height: 4,
            width: '100%',
            background: 'linear-gradient(90deg, #00843D 0 40%, #FFD100 40% 70%, #111111 70% 100%)',
        }}/>);
}
const STATUT_STYLES = {
    TRAITEE: { bg: '#E6F4EC', fg: '#198754', label: 'Résolue' },
    EN_COURS: { bg: '#FFF4D6', fg: '#8a6d00', label: 'En cours' },
    NOUVELLE: { bg: '#FDECEA', fg: '#DC3545', label: 'Nouvelle' },
    VUE: { bg: '#E7F1FF', fg: '#0D6EFD', label: 'Vue' },
};
// ---------- Composant principal ----------
export const RapportMensuelPrint = React.forwardRef((props, ref) => {
    const { reponses, radarData, alertes, taches, themes, guichets, agenceName, commune, periodeLabel, dateDebut, dateFin, deltas, tempsTraitement, } = props;
    // RG01/RG02 : un avis = une soumission — les stats du rapport ne comptent
    // jamais les lignes Reponse individuelles.
    const avisGroupes = regrouperAvisParSoumission(reponses);
    const totalAvis = avisGroupes.length;
    const distribution = [1, 2, 3, 4, 5].map((note) => {
        const nb = avisGroupes.filter((a) => Math.round(a.score_moyen) === note).length;
        return { note, nb, pct: totalAvis > 0 ? Math.round((nb / totalAvis) * 100) : 0 };
    });
    const noteMoyenne = totalAvis > 0 ? avisGroupes.reduce((s, a) => s + a.score_moyen, 0) / totalAvis : 0;
    const tauxSatisfaction = totalAvis > 0 ? (avisGroupes.filter((a) => a.score_moyen >= 4).length / totalAvis) * 100 : 0;
    const alertesCloturees = alertes.filter((a) => a.statut_alerte === 'TRAITEE').length;
    const tachesEnRetard = taches.filter((t) => {
        if (!t.date_echeance || t.statut_tache === 'TERMINEE')
            return false;
        return new Date(t.date_echeance) < new Date();
    }).length;
    const fmtDate = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const fmtDateCourt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const fleche = (v) => (v > 0 ? '▲' : v < 0 ? '▼' : '—');
    const signe = (v, unite = '') => `${v > 0 ? '+' : ''}${Number.isInteger(v) ? v : v.toFixed(1)}${unite}`;
    const alertesRapport = alertes.slice(0, 10);
    const tachesParAlerte = new Map();
    for (const t of taches) {
        if (t.id_alerte != null && !tachesParAlerte.has(t.id_alerte))
            tachesParAlerte.set(t.id_alerte, t);
    }
    const maxThemeCount = Math.max(1, ...themes.map((t) => t.count));
    const guichetsFaibles = [...guichets].sort((a, b) => a.score_moyen - b.score_moyen).slice(0, 5);
    return (<div ref={ref} className="rapport-yeba" style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '14mm 16mm',
            background: '#FFFFFF',
            color: '#111111',
            fontFamily: "'Satoshi', system-ui, sans-serif",
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
        }}>
      {/* ============ EN-TÊTE ============ */}
      <header style={{ borderBottom: '3px solid #00843D', paddingBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#00843D' }}>Yé</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#F57C00' }}>ba</span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', color: '#6C757D', textTransform: 'uppercase', marginLeft: 6 }}>
                Rapport de performance qualité
              </span>
            </div>
            <p style={{ fontSize: 10, color: '#6C757D', marginTop: 4 }}>
              Généré le {fmtDate(new Date())} · Plateforme Yeba × La Poste de Côte d'Ivoire
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{agenceName}</p>
            <p style={{ fontSize: 11, color: '#6C757D' }}>{commune}</p>
          </div>
        </div>
      </header>

      {/* ============ TITRE + PÉRIODE ============ */}
      <div style={{ background: '#F8F9FA', border: '1px solid #E9ECEF', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bilan de satisfaction client — {periodeLabel}
          </h2>
          <p style={{ fontSize: 10, color: '#6C757D', marginTop: 2 }}>
            Période analysée : du {fmtDate(dateDebut)} au {fmtDate(dateFin)}
          </p>
        </div>
        <Liseré />
      </div>

      {/* ============ SYNTHÈSE (6 indicateurs) ============ */}
      <section>
        <SectionTitre>Synthèse de la période</SectionTitre>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Indicateur label="Avis collectés" valeur={String(totalAvis)} detail={`${signe(deltas.volume, '%')} vs période précédente`}/>
          <Indicateur label="Note moyenne" valeur={`${noteMoyenne.toFixed(2)}/5`} detail={`${signe(deltas.note, ' pt')} vs précédent`}/>
          <Indicateur label="Taux de satisfaction" valeur={`${Math.round(tauxSatisfaction)}%`} detail={`${signe(deltas.satisfaction, ' pt')} vs précédent`}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
          <Indicateur label="Alertes traitées" valeur={`${alertesCloturees}/${alertes.length}`} detail="Suivi jusqu'à résolution"/>
          <Indicateur label="Actions correctives" valeur={String(taches.length)} detail={tachesEnRetard > 0 ? `dont ${tachesEnRetard} en retard` : 'aucune en retard'}/>
          <Indicateur label="Délai moyen de traitement" valeur={tempsTraitement?.moyenne_heures != null ? `${tempsTraitement.moyenne_heures.toFixed(1)} h` : '—'} detail="Alerte créée → prise en charge"/>
        </div>
      </section>

      {/* ============ DISTRIBUTION DES NOTES (barres CSS) ============ */}
      <section>
        <SectionTitre>Distribution des notes ({totalAvis} avis)</SectionTitre>
        {totalAvis === 0 ? (<p style={{ fontSize: 11, color: '#6C757D', fontStyle: 'italic' }}>
            Aucun avis collecté sur cette période — les indicateurs seront renseignés dès les premières soumissions.
          </p>) : (<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {distribution.map((d) => (<div key={d.note} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 90px', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{d.note} étoile{d.note > 1 ? 's' : ''}</span>
                <div style={{ height: 14, background: '#F1F3F5', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{
                    width: `${d.pct}%`,
                    height: '100%',
                    background: d.note >= 4 ? '#198754' : d.note === 3 ? '#F59E0B' : '#DC3545',
                    borderRadius: 7,
                }}/>
                </div>
                <span style={{ fontSize: 11, color: '#343A40', textAlign: 'right' }}>
                  {d.nb} avis · {d.pct}%
                </span>
              </div>))}
          </div>)}
      </section>

      {/* ============ TENDANCE (si historique) ============ */}
      {/* (La tendance mensuelle complète reste sur le dashboard ; ici on rappelle le delta clé en tête.) */}

      {/* ============ RADAR QUALITÉ 5 PILIERS (barres CSS) ============ */}
      <section>
        <SectionTitre>Les 5 piliers de la qualité</SectionTitre>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {radarData.map((r) => (<div key={r.subject} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 52px', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#343A40' }}>{r.subject}</span>
              <div style={{ height: 12, background: '#F1F3F5', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                width: `${Math.max(0, Math.min(100, r.A))}%`,
                height: '100%',
                background: r.A >= 80 ? '#198754' : r.A >= 50 ? '#F59E0B' : '#DC3545',
                borderRadius: 6,
            }}/>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#111', textAlign: 'right' }}>{r.A}/100</span>
            </div>))}
        </div>
      </section>

      {/* ============ THÈMES D'INSATISFACTION (IA) ============ */}
      {themes.length > 0 && (<section>
          <SectionTitre>Thèmes identifiés dans les commentaires (analyse IA)</SectionTitre>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {themes.slice(0, 6).map((t) => (<div key={t.theme} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 40px', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#343A40', textTransform: 'capitalize' }}>{t.theme}</span>
                <div style={{ height: 10, background: '#F1F3F5', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${(t.count / maxThemeCount) * 100}%`, height: '100%', background: '#00843D', borderRadius: 5 }}/>
                </div>
                <span style={{ fontSize: 10, color: '#6C757D', textAlign: 'right' }}>{t.count}</span>
              </div>))}
          </div>
          <p style={{ fontSize: 9, color: '#6C757D', marginTop: 6, fontStyle: 'italic' }}>
            Analyse automatique des commentaires — agrégats uniquement, aucun client identifié.
          </p>
        </section>)}

      {/* ============ PERFORMANCE DES GUICHETS ============ */}
      {guichetsFaibles.length > 0 && (<section>
          <SectionTitre>Guichets à surveiller (notes les plus basses)</SectionTitre>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F8F9FA', borderBottom: '1px solid #E9ECEF' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6C757D' }}>Guichet</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6C757D' }}>Avis</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6C757D' }}>Note moyenne</th>
                <th style={{ width: '42%', padding: '6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {guichetsFaibles.map((g) => (<tr key={g.nom} style={{ borderBottom: '1px solid #F1F3F5' }}>
                  <td style={{ padding: '7px 8px', fontWeight: 700, color: '#111' }}>{g.nom}</td>
                  <td style={{ padding: '7px 8px', color: '#343A40' }}>{g.nb_avis}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <BarreNote note={g.score_moyen}/>
                  </td>
                  <td />
                </tr>))}
            </tbody>
          </table>
        </section>)}

      {/* ============ REGISTRE D'AMÉLIORATION ============ */}
      <section>
        <SectionTitre>Registre d'amélioration continue — alertes &amp; actions</SectionTitre>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
          <thead>
            <tr style={{ background: '#F8F9FA', borderBottom: '1px solid #E9ECEF' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6C757D' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6C757D' }}>Alerte générée</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6C757D' }}>Statut</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6C757D' }}>Action corrective associée</th>
            </tr>
          </thead>
          <tbody>
            {alertesRapport.length > 0 ? (alertesRapport.map((a) => {
            const st = STATUT_STYLES[a.statut_alerte] ?? { bg: '#F1F3F5', fg: '#343A40', label: a.statut_alerte };
            const tacheLiee = tachesParAlerte.get(a.id);
            return (<tr key={String(a.id)} style={{ borderBottom: '1px solid #F1F3F5' }}>
                    <td style={{ padding: '7px 8px', color: '#6C757D', whiteSpace: 'nowrap' }}>{fmtDateCourt(a.date_creation)}</td>
                    <td style={{ padding: '7px 8px', fontWeight: 600, color: '#111' }}>{a.message}</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{ background: st.bg, color: st.fg, fontWeight: 800, fontSize: 9, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '7px 8px', color: '#343A40', fontStyle: tacheLiee ? 'normal' : 'italic' }}>
                      {tacheLiee ? tacheLiee.titre : 'Aucune action requise'}
                    </td>
                  </tr>);
        })) : (<tr>
                <td colSpan={4} style={{ padding: '14px 8px', textAlign: 'center', color: '#6C757D', fontStyle: 'italic' }}>
                  Aucun événement critique enregistré sur la période — à confirmer par la poursuite de la collecte.
                </td>
              </tr>)}
          </tbody>
        </table>
        {alertes.length > 10 ? (<p style={{ fontSize: 9.5, color: '#6C757D', marginTop: 6 }}>
            + {alertes.length - 10} autres événements consultables dans le module Alertes &amp; Actions.
          </p>) : null}
      </section>

      {/* ============ LECTURE & PROCHAINES ÉTAPES ============ */}
      <section style={{ background: '#F8F9FA', border: '1px solid #E9ECEF', borderRadius: 12, padding: '12px 16px' }}>
        <SectionTitre>Lecture du rapport</SectionTitre>
        <ul style={{ fontSize: 10.5, color: '#343A40', lineHeight: 1.7, paddingLeft: 16, margin: 0 }}>
          <li>Un avis regroupe toutes les évaluations d'un même client (une soumission = un avis).</li>
          <li>Le taux de satisfaction compte les avis dont la moyenne est ≥ 4/5.</li>
          <li>Les commentaires sont analysés par l'IA sous forme de thèmes agrégés — la confidentialité des clients et des agents est préservée.</li>
          <li>Les actions correctives sont suivies jusqu'à leur résolution (relance automatique en cas de retard).</li>
        </ul>
      </section>

      {/* ============ VISAS ============ */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 'auto' }}>
        <div style={{ textAlign: 'center', padding: 14, border: '1px dashed #E9ECEF', borderRadius: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6C757D' }}>
            Visa Chef d'Agence
          </p>
          <div style={{ height: 54 }}/>
          <p style={{ fontSize: 10, color: '#343A40' }}>{agenceName}</p>
        </div>
        <div style={{ textAlign: 'center', padding: 14, border: '1px dashed #E9ECEF', borderRadius: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6C757D' }}>
            Cachet Direction Qualité
          </p>
          <div style={{ height: 54 }}/>
          <p style={{ fontSize: 10, color: '#6C757D' }}>Validé sous Yeba</p>
        </div>
      </section>

      <footer>
        <Liseré />
        <p style={{ fontSize: 8.5, color: '#6C757D', marginTop: 6, textAlign: 'center' }}>
          Document généré par la plateforme Yeba — données confidentielles, usage interne {agenceName}. Conforme loi n°2013-450 (ARTCI).
        </p>
      </footer>
    </div>);
});
RapportMensuelPrint.displayName = 'RapportMensuelPrint';
