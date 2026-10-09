import { Link } from 'react-router';
import { LegalLinks } from '../components/LegalLinks';
const Section = ({ title, children }) => (<section className="space-y-3 border-t border-border/70 pt-6">
    <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
  </section>);
export function PolitiqueConfidentialitePage() {
    return (<div className="min-h-screen bg-app-shell px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-10">
        <header className="space-y-4">
          <Link to="/" className="text-sm font-semibold text-primary-strong underline-offset-4 hover:underline">Yéba</Link>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Document de travail — informations à compléter avant publication</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Politique de confidentialité</h1>
          <p className="text-sm leading-6 text-muted-foreground">Cette page décrit les données traitées par Yéba pour la collecte de satisfaction en agence et l’administration de l’outil.</p>
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-foreground">
            <strong>Responsable indiqué : Yéba.</strong> L’identité juridique complète de l’éditeur, son adresse postale et le contact chargé des demandes de données restent à renseigner : <span className="font-semibold">[coordonnées publiques Yéba à renseigner]</span>. Cette version ne doit pas être considérée comme finalisée avant ces compléments.
          </div>
        </header>

        <Section title="1. Données et finalités">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">Questionnaires QR :</strong> évaluations, réponses aux questions, commentaire libre et identifiants techniques de la soumission, utilisés pour suivre la qualité du service, repérer des problèmes et produire des indicateurs.</li>
            <li><strong className="text-foreground">Rappel demandé :</strong> numéro de téléphone facultatif, uniquement si la personne coche son accord ; il sert à la recontacter au sujet de son avis.</li>
            <li><strong className="text-foreground">Comptes du personnel :</strong> adresse électronique, nom, rôle et rattachement à une agence, nécessaires à l’authentification, à la gestion des habilitations et à la traçabilité.</li>
            <li><strong className="text-foreground">Sécurité :</strong> certaines données techniques, dont l’adresse IP, peuvent être traitées pour limiter les abus, protéger les accès et tenir les journaux de sécurité.</li>
          </ul>
        </Section>

        <Section title="2. Caractère facultatif et accord au rappel">
          <p>Le questionnaire QR ne demande ni compte ni numéro de téléphone. La personne peut envoyer son avis sans commentaire et sans demander de rappel. La case de rappel concerne uniquement l’usage du numéro pour répondre à cette demande ; son refus n’empêche pas la participation.</p>
          <p>Le numéro de rappel est chiffré en base, exclu des exports génériques et des prompts IA, et accessible à la demande au seul chef de l’agence concernée. Le numéro chiffré est effacé dès que le chef marque le rappel comme traité. Sinon, il expire après 90 jours et la purge quotidienne le supprime dans les 24 heures suivant l’échéance. La trace de traitement, sans le numéro, est conservée jusqu’à 90 jours après la clôture puis supprimée par cette même purge quotidienne.</p>
          <p>Un identifiant HMAC dérivé d’un numéro peut également être conservé temporairement à des fins de limitation technique des votes ; le numéro en clair n’est pas conservé par ce mécanisme. La purge est exécutée par une tâche quotidienne après le délai technique de 24 heures. Ce dispositif ne garantit pas actuellement le rejet de toutes les réponses répétées.</p>
        </Section>

        <Section title="3. IA et destinataires">
          <p>Si l’analyse IA est activée, le commentaire et une note éventuelle sont envoyés à OpenRouter avec un modèle marqué gratuit. La requête exige un prix maximal nul, refuse les fournisseurs déclarant collecter les données et demande un endpoint sans conservation ; si aucun endpoint ne respecte ces filtres, l’analyse échoue. Ces filtres de routage ne remplacent pas les conditions propres au fournisseur du modèle.</p>
          <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-foreground"><strong>Attention :</strong> la page du modèle gratuit NVIDIA utilisé par défaut indique que les requêtes sont journalisées à des fins de sécurité et d’amélioration de ses produits, et demande de ne pas transmettre de données personnelles ou confidentielles. Les téléphones, courriels et URL reconnus sont masqués localement, mais les noms et autres éléments indirectement identifiants ne peuvent pas être détectés avec certitude. N’inscrivez pas de données personnelles ou confidentielles dans un commentaire ; les conditions du modèle configuré doivent être vérifiées avant activation.</p>
          <p>Les traitements IA sont désactivés si aucun modèle gratuit n’accepte les contraintes techniques configurées. Les commentaires bruts ne sont pas remplacés par le résumé IA et peuvent rester consultables par le personnel habilité selon son rôle. Consultez les <a href="https://openrouter.ai/nvidia/nemotron-3.5-lightning:free" target="_blank" rel="noreferrer" className="font-semibold text-primary-strong underline underline-offset-2">conditions et l’avis de données du modèle NVIDIA gratuit par défaut</a> ; si un autre modèle est configuré, consultez l’avis applicable à ce modèle.</p>
          <p>Les données sont hébergées dans la base Neon et l’application Render. Les personnes et sous-traitants ayant besoin d’y accéder pour fournir ou administrer le service peuvent recevoir certaines données. Les régions exactes d’hébergement, les éventuels transferts hors de Côte d’Ivoire et les détails de conservation des prestataires doivent être confirmés avant publication.</p>
        </Section>

        <Section title="4. Conservation">
          <p><strong className="text-foreground">Numéros de rappel :</strong> supprimés dès que le rappel est marqué traité, sinon après expiration à 90 jours, avec un délai de purge pouvant aller jusqu’à 24 heures. <strong className="text-foreground">Traces de traitement et empreintes techniques anti-rejeu :</strong> purge quotidienne après leur échéance de conservation.</p>
          <p><strong className="text-foreground">Avis, réponses, commentaires bruts, journaux et comptes :</strong> leurs durées détaillées doivent encore être définies et publiées par Yéba et l’organisation cliente. Nous ne présentons pas ces durées comme établies dans cette version.</p>
        </Section>

        <Section title="5. Demandes relatives aux données">
          <p>Pour demander l’accès, la rectification ou l’effacement de données, ou poser une question sur leur utilisation, écrivez à <strong className="text-foreground">[adresse de contact confidentialité Yéba à renseigner]</strong>. Le responsable et le canal de contact doivent être complétés avant publication définitive.</p>
          <p>La collecte et l’information des personnes doivent être vérifiées au regard de la <a href="https://www.artci.ci/images/stories/pdf/lois/loi_2013_450.pdf" target="_blank" rel="noreferrer" className="font-semibold text-primary-strong underline underline-offset-2">loi ivoirienne n° 2013-450 sur les données à caractère personnel</a>, notamment les informations à communiquer lors de la collecte.</p>
          <p>Consultez aussi les <Link to="/conditions" className="font-semibold text-primary-strong underline underline-offset-2">conditions d’utilisation</Link>.</p>
        </Section>

        <footer className="border-t border-border/70 pt-6"><LegalLinks /></footer>
      </article>
    </div>);
}
//# sourceMappingURL=PolitiqueConfidentialitePage.jsx.map