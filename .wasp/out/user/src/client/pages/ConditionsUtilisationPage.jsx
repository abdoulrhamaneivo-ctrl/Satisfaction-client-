import { Link } from 'react-router';
import { LegalLinks } from '../components/LegalLinks';
const Section = ({ title, children }) => (<section className="space-y-3 border-t border-border/70 pt-6">
    <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
  </section>);
export function ConditionsUtilisationPage() {
    return (<div className="min-h-screen bg-app-shell px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-10">
        <header className="space-y-4">
          <Link to="/" className="text-sm font-semibold text-primary-strong underline-offset-4 hover:underline">Yéba</Link>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Document de travail — coordonnées éditeur à compléter</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Conditions d’utilisation</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Ces conditions encadrent l’utilisation de Yéba, outil interne de collecte et de pilotage de la satisfaction en agence, ainsi que les réponses recueillies au moyen d’un QR code.
          </p>
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-foreground">
            <strong>Avant publication :</strong> l’identité juridique complète de l’éditeur et ses coordonnées publiques doivent être ajoutées. Contact : <span className="font-semibold">[adresse de contact Yéba à renseigner]</span>.
          </div>
        </header>

        <Section title="1. Utilisateurs de Yéba">
          <p>Yéba est un outil de travail réservé aux personnes autorisées par l’organisation cliente. Les comptes du personnel sont créés sur invitation ; aucune inscription publique ni aucun espace commercial en libre-service n’est proposé.</p>
          <p>Le personnel utilise son compte nominatif, protège ses identifiants et consulte uniquement les données nécessaires à son rôle et à son agence. Il ne partage pas les avis ou les coordonnées de rappel en dehors des personnes habilitées et signale rapidement toute perte d’accès ou anomalie.</p>
          <p>La Direction gère les agences et les accès. Les chefs d’agence consultent les avis et, uniquement si une personne l’a demandé, le numéro associé à ce rappel. Les exports et analyses générales ne contiennent pas ce numéro.</p>
        </Section>

        <Section title="2. Répondants au questionnaire QR">
          <p>Le questionnaire recueille des évaluations et réponses facultatives pour aider l’agence à améliorer son service. Il peut être rempli sans compte et sans fournir de numéro de téléphone.</p>
          <p>Les réponses peuvent être associées à une soumission, une agence, un guichet et une opération. N’inscrivez pas dans un commentaire des informations personnelles ou sensibles qui ne sont pas nécessaires à votre retour.</p>
          <p>Le numéro est facultatif. Il est enregistré pour un rappel par le chef de l’agence seulement si la case d’accord est cochée. Cet accord est distinct de la réponse au questionnaire et peut être refusé sans empêcher l’envoi de l’avis.</p>
        </Section>

        <Section title="3. Analyses assistées par IA">
          <p>Lorsque la fonction est activée, Yéba peut utiliser un modèle d’IA gratuit pour classer des commentaires et résumer des indicateurs agrégés. Le numéro de rappel, les noms des agents et les noms d’agence ou de guichet ne sont pas envoyés au modèle. Les coordonnées usuelles détectées dans un commentaire sont masquées avant transmission.</p>
          <p>Les sorties de l’IA sont des aides à l’analyse et ne remplacent pas l’examen humain. Le service impose un prix maximal nul et demande un endpoint sans conservation ; si aucun modèle gratuit ne respecte ces contraintes techniques, l’analyse est indiquée comme indisponible. Le fournisseur du modèle peut toutefois appliquer des conditions supplémentaires. La page du modèle gratuit NVIDIA utilisé par défaut indique que les requêtes sont journalisées à des fins de sécurité et d’amélioration de ses produits ; ne saisissez donc aucune donnée personnelle ou confidentielle dans un commentaire. Consultez l’avis du modèle configuré dans la <Link to="/confidentialite" className="font-semibold text-primary-strong underline underline-offset-2">politique de confidentialité</Link>.</p>
        </Section>

        <Section title="4. Disponibilité et évolution">
          <p>Yéba est fourni pour les opérations de collecte et de pilotage convenues avec l’organisation cliente. Une interruption technique, une maintenance ou l’indisponibilité d’un service tiers peut temporairement affecter certaines fonctions ; les évaluations ne doivent pas servir seules à prendre une décision individuelle défavorable.</p>
          <p>Ces conditions peuvent être mises à jour pour refléter l’évolution du service. La version affichée ici est celle applicable à la date de consultation.</p>
        </Section>

        <Section title="5. Contact">
          <p>Pour signaler un problème lié à l’utilisation de Yéba : <strong className="text-foreground">[adresse de contact Yéba à renseigner]</strong>. L’identité juridique de l’éditeur et l’adresse postale seront précisées avant publication définitive.</p>
          <p>Pour les données personnelles, consultez la <Link to="/confidentialite" className="font-semibold text-primary-strong underline underline-offset-2">politique de confidentialité</Link>.</p>
        </Section>

        <footer className="border-t border-border/70 pt-6"><LegalLinks /></footer>
      </article>
    </div>);
}
