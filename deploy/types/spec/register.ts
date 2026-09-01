// The import ensures the module is always loaded into the bundle.
// Otherwise, module augmentation can fail if it wasn't loaded.
import "@wasp.sh/spec";

declare module "@wasp.sh/spec" {
  export interface Register {
    entities: {
      User: "User";
      Entreprise: "Entreprise";
      Agence: "Agence";
      Guichet: "Guichet";
      AffectationGuichet: "AffectationGuichet";
      Service: "Service";
      Critere: "Critere";
      CritereService: "CritereService";
      AgenceCritere: "AgenceCritere";
      Objectif: "Objectif";
      Canal: "Canal";
      Reponse: "Reponse";
      AnalyseAvisIA: "AnalyseAvisIA";
      Alerte: "Alerte";
      TacheCorrective: "TacheCorrective";
      TacheCorrectiveHistorique: "TacheCorrectiveHistorique";
      VoteAntiRejeu: "VoteAntiRejeu";
      StatistiquesMensuelles: "StatistiquesMensuelles";
      File: "File";
      Logs: "Logs";
      Invitation: "Invitation";
      AuditLog: "AuditLog";
      BrandingConfig: "BrandingConfig";
    }
  }
}
