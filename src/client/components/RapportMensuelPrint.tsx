import React from 'react';
import { HistogrammeSatisfaction, RadarQualite } from './DashboardCharts';
import { regrouperAvisParSoumission } from '../utils';

interface RapportProps {
  reponses: any[];
  radarData: any[];
  alertes: any[];
  taches: any[];
  agenceName: string;
  commune: string;
}

export const RapportMensuelPrint = React.forwardRef<HTMLDivElement, RapportProps>((props, ref) => {
  const { reponses, radarData, alertes, taches, agenceName, commune } = props;

  // Un avis = une soumission (id_soumission), pas une ligne Reponse. Un
  // formulaire à plusieurs critères ne doit pas gonfler le total du rapport
  // ni fausser la note moyenne / le taux de satisfaction affichés au chef
  // d'entreprise.
  const avisGroupes = regrouperAvisParSoumission(reponses);
  const totalAvis = avisGroupes.length;
  const noteMoyenne = totalAvis > 0
    ? (avisGroupes.reduce((acc, a) => acc + a.score_moyen, 0) / totalAvis).toFixed(2)
    : '0.00';

  const tauxSatisfaction = totalAvis > 0
    ? ((avisGroupes.filter(a => a.score_moyen >= 4).length / totalAvis) * 100).toFixed(0)
    : '0';

  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const alertesCloturees = alertes.filter(a => a.statut_alerte === 'TRAITEE').length;
  const totalAlertes = alertes.length;

  return (
    <div ref={ref} className="p-12 bg-white text-slate-900 font-sans space-y-10 print:p-8" style={{ width: '210mm' }}>
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Yeba • Rapport de Performance</h1>
          <p className="text-xs font-mono text-slate-500 mt-1">Généré le {dateGeneration}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-sm text-slate-900">Agence : {agenceName}</p>
          <p className="text-xs text-slate-500">Commune : {commune}</p>
        </div>
      </div>

      <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
          Bilan Mensuel de Conformité & de Satisfaction Client
        </h2>
        <p className="text-xs text-slate-500 font-mono mt-1">Conforme aux exigences de la norme de service qualité FD X50-167</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="border border-slate-200 p-4 rounded-xl text-center space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avis Collectés</p>
          <p className="text-2xl font-black text-slate-900">{totalAvis}</p>
        </div>
        <div className="border border-slate-200 p-4 rounded-xl text-center space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note Moyenne</p>
          <p className="text-2xl font-black text-slate-900">{noteMoyenne} / 5</p>
        </div>
        <div className="border border-slate-200 p-4 rounded-xl text-center space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Satisfaction Globale</p>
          <p className="text-2xl font-black text-slate-900">{tauxSatisfaction}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 pt-4">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Distribution des Notes</h3>
          <div className="border border-slate-100 p-2 rounded-xl">
            <HistogrammeSatisfaction data={reponses} />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Évaluation des 5 Piliers</h3>
          <div className="border border-slate-100 p-2 rounded-xl">
            <RadarQualite data={radarData} />
          </div>
        </div>
      </div>

      <div className="page-break print:break-before-page pt-10"></div>

      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Registre d'amélioration continue</h3>
          <span className="text-xs font-mono text-slate-500">
            Alertes résolues : {alertesCloturees} / {totalAlertes}
          </span>
        </div>

        <div className="overflow-hidden border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Alerte générée</th>
                <th className="px-4 py-2.5">Statut</th>
                <th className="px-4 py-2.5">Plan d'action correctif associé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {alertes.length > 0 ? (
                alertes.slice(0, 8).map((alerte: any) => {
                  const linkedTache = taches.find(t => String(t.id_alerte) === String(alerte.id));
                  return (
                    <tr key={alerte.id}>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {new Date(alerte.date_creation).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{alerte.message}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${alerte.statut_alerte === 'TRAITEE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                          {alerte.statut_alerte === 'TRAITEE' ? 'Résolu' : 'En cours'}
                        </span>
                      </td>
                      <td className="px-4 py-3 italic">
                        {linkedTache ? linkedTache.titre : 'Aucune tâche requise'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Aucun événement critique enregistré ce mois-ci.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 pt-10">
        <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visa Responsable Agence</p>
          <div className="h-16"></div>
          <p className="text-xs font-mono text-slate-700">{agenceName}</p>
        </div>
        <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cachet Auditeur / Direction Qualité</p>
          <div className="h-16"></div>
          <p className="text-xs font-mono text-slate-400">Validé sous Yeba</p>
        </div>
      </div>
    </div>
  );
});

RapportMensuelPrint.displayName = 'RapportMensuelPrint';