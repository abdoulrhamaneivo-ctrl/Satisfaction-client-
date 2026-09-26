import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, getFormDefinitionForGuichet, soumettreAvis, completerSoumission } from 'wasp/client/operations';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import confetti from 'canvas-confetti';
import { ChevronRight, MessageSquare, Phone, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { AmbientBackground } from '../components/AmbientBackground';
import { Card, Eyebrow } from '../components/ds';
import { NOTE_CONFIG, visuelPourNote } from '../components/NoteVisuel';
import { parseCollecteIdentifier } from '../collecte/routeParams';
import {
  optionsAffichage,
  payloadSmiley,
  payloadOuiNon,
  payloadQCM,
  payloadTexte,
  payloadValeur,
  payloadCases,
  bornesEchelle,
  choixEchelle,
  type ReponseCollecte,
  type OptionAffichage,
} from '../collecte/payload';

type ServiceType = {
  id: number;
  libelle_service: string;
  criteres: any[];
};

// ---------- CONSTANTES HORS COMPOSANT (performance) ----------
// Toute valeur recréée à chaque render devient un nouvel objet/la même valeur
// mais une nouvelle FONCTION pour React → re-renders inutiles à chaque frappe.
// Déclarées ici : zéro allocation par frappe, références stables.

// Transition unique partagée par toutes les animations du formulaire.
// Durées courtes (0.18s) : réactivité perçue maximale au clic.
const TRANSITION = { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

// Propriétés d'animation communes : opacity seul (composité GPU, ne déclenche
// ni layout ni paint — contrairement à x/y qui reflowent).
const FADE_IN = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: TRANSITION };

// Styles statiques pré-calculés (pas de template-literals ré-évalués par frappe)
const BTN_BASE = 'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// Vague 1 Phase E — parcours sans bouton « Envoyer mon avis » :
// réponse → accusé 500 ms → question suivante → dernière réponse =
// soumission auto (T1) → commentaire facultatif auto-sauvé (T2) → merci.
const DELAI_ACCUSE_MS = 500;
const DELAI_AUTOSAVE_T2_MS = 900;
const DELAI_AVANCE_APRES_SAVE_MS = 1400;
// Borne partagée : reset automatique pour le client suivant.
const DELAI_RESET_BORNE_MS = 10000;

/**
 * Pastille de progression (Vague 4 — WCAG 2.2 AA).
 * Extraite de la barre collante pour être utilisée par les deux étapes
 * (questions et récapitulatif) sans duplication. L'icône seule n'est pas
 * une information utile : la pastille porte un libellé explicite, et le
 * repère "en cours" est réservé à la question affichée.
 */
const IndicateurReponse = ({
  reponse,
  position,
  total,
  enCours,
  peutReduireMouvement,
}: {
  reponse: ReponseCollecte | undefined;
  position: number;
  total: number;
  enCours: boolean;
  peutReduireMouvement: boolean;
}) => {
  if (reponse && reponse.critereId !== undefined) {
    if (reponse.score !== undefined) {
      return (
        <span className="text-lg leading-none" title={`Question ${position + 1} : ${reponse.score}/5`}>
          {visuelPourNote(reponse.score).icon}
          <span className="sr-only">
            Question {position + 1} sur {total} : note {reponse.score} sur 5.
          </span>
        </span>
      );
    }
    return (
      <span
        className="text-lg leading-none text-success-strong font-black"
        title={`Question ${position + 1} : répondu`}
      >
        <span aria-hidden>✓</span>
        <span className="sr-only">
          Question {position + 1} sur {total} : répondue.
        </span>
      </span>
    );
  }
  if (enCours) {
    return (
      <motion.span
        animate={peutReduireMouvement ? { opacity: 1 } : { opacity: [0.4, 1, 0.4] }}
        transition={peutReduireMouvement ? { duration: 0 } : { duration: 1.4, repeat: Infinity }}
        className="size-5 rounded-full border-2 border-primary"
      >
        <span className="sr-only">
          Question {position + 1} sur {total} : en cours.
        </span>
      </motion.span>
    );
  }
  return (
    <span className="size-5 rounded-full bg-muted border border-border/60">
      <span className="sr-only">
        Question {position + 1} sur {total} : sans réponse.
      </span>
    </span>
  );
};

/**
 * Identifiant de soumission (idempotence côté serveur).
 * `crypto.randomUUID` n'existe qu'en contexte SÉCURISÉ : une borne servie en
 * HTTP sur réseau local — déploiement de référence — n'en a pas. On propose
 * donc un repli, jamais une exception : une soumission bloquée sans message
 * est le pire scénario pour un client qui a répondu à tout.
 */
export const genererIdSoumission = (): string => {
  const uuid = (globalThis.crypto as Crypto | undefined)?.randomUUID;
  if (typeof uuid === 'function') {
    try {
      return uuid.call(globalThis.crypto);
    } catch {
      /* contexte non sécurisé malgré tout : on retombe plus bas */
    }
  }
  const alea = Math.random().toString(36).slice(2, 10);
  return `s-${Date.now().toString(36)}-${alea}-${alea}`;
};

/**
 * Navigation clavier d'un groupe d'options (Vague 4 — WCAG 2.2 AA 2.1.1).
 * Dans un groupe de choix unique, les flèches doivent déplacer la sélection :
 * Tab sert à quitter le groupe, pas à le parcourir option par option (sinon
 * 11 tabulations pour un NPS 0-10). Espace et Entrée restent l'activation
 * classique d'un <button>.
 */
const deplacerChoix = (
  evenement: React.KeyboardEvent<HTMLElement>,
  index: number,
  total: number,
  choisir: (i: number) => void,
) => {
  const touches: Record<string, number> = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
  };
  const pas = touches[evenement.key];
  if (pas === undefined) return;
  evenement.preventDefault();
  choisir((index + pas + total) % total);
};

const normaliserTelephone = (valeur: string): string => {
  const chiffres = valeur.replace(/[^\d]/g, '');
  if (!chiffres) return '';
  if (chiffres.startsWith('225') && chiffres.length === 13) return `+${chiffres}`;
  if (chiffres.startsWith('00225')) return `+225${chiffres.slice(5)}`;
  return `+225${chiffres}`;
};

type Accuse = { texte: string; icone: React.ReactNode } | null;
type EtatT1 = { etat: 'attente' | 'encours' | 'envoye' | 'erreur'; erreur: string | null };
type EtatT2 = { etat: 'idle' | 'saving' | 'saved' | 'error'; erreur: string | null };

export const CollectePage = () => {
  // C4 : seule voie publique — code opaque non prédictible (/q/:code).
  // Tout autre identifiant (y compris un ID numérique) → 404 uniforme.
  const params = useParams<{ code?: string }>();
  const identifiantBrut = (params.code ?? '').trim();
  const identifiant = parseCollecteIdentifier(identifiantBrut);
  const codePublic = identifiant?.kind === 'publicCode' ? identifiant.code : null;

  const { data: formDef, isLoading, isError } = useQuery(
    getFormDefinitionForGuichet,
    { code_public: codePublic ?? '' },
    { enabled: !!codePublic }
  );
  const { brandConfig } = useBrand();
  // Personnalisation du guichet (FIX 05/09) : la page publique n'est pas
  // connectée donc le contexte garde les défauts — on prend la marque
  // fusionnée du guichet (entreprise → défaut Yéba) quand elle existe.
  const marque: any = (formDef as any)?.brandConfig ?? brandConfig;

  const [step, setStep] = useState<'SERVICE_SELECT' | 'QUESTIONS' | 'COMMENT_STEP' | 'SUCCESS'>('SERVICE_SELECT');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ReponseCollecte[]>([]);

  const [commentaire, setCommentaire] = useState('');
  const [texteReponseCourante, setTexteReponseCourante] = useState('');
  const [casesSelectionnes, setCasesSelectionnes] = useState<OptionAffichage[]>([]);
  const [telephone, setTelephone] = useState('');
  // T1 (notes) et T2 (commentaire) : états séparés, jamais de bouton bloquant.
  const [t1, setT1] = useState<EtatT1>({ etat: 'attente', erreur: null });
  const [t2, setT2] = useState<EtatT2>({ etat: 'idle', erreur: null });
  const soumissionIdRef = useRef<string | null>(null);
  const dernierSaveT2Ref = useRef<string | null>(null);
  // Accusé visuel générique (note OU libellé du choix) avant transition.
  const [accuse, setAccuse] = useState<Accuse>(null);
  const [choixEnCours, setChoixEnCours] = useState<string | null>(null);
  const delaiRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titreRef = useRef<HTMLHeadingElement | null>(null);
  // Miroirs des champs de l'étape commentaire, lisibles depuis le
  // nettoyage de l'onglet (le handler de démontage est capturé une fois).
  const commentaireRef = useRef('');
  const telephoneRef = useRef('');
  commentaireRef.current = commentaire;
  telephoneRef.current = telephone;

  const annulerDelais = () => {
    for (const r of [delaiRef, autosaveRef, avanceRef, resetRef]) {
      if (r.current) {
        clearTimeout(r.current);
        r.current = null;
      }
    }
  };

  useEffect(() => {
    setTexteReponseCourante('');
    setCasesSelectionnes([]);
    setAccuse(null);
    setChoixEnCours(null);
    if (delaiRef.current) {
      clearTimeout(delaiRef.current);
      delaiRef.current = null;
    }
  }, [currentQuestionIndex, step]);

  useEffect(() => () => {
    // Vague 1 (P13) : à la fermeture de l'onglet, un debounce d'autosave en
    // vol disappearait sans rien envoyer. On tente un envoi de dernière
    // chance (le navigateur peut l'annuler, mais ce n'est plus une perte
    // certaine) au lieu d'annuler bêtement le minuteur.
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
      const texte = commentaireRef.current.trim();
      const tel = telephoneRef.current.trim();
      if ((texte || tel) && t1.etat === 'envoye') {
        void completerSoumission({
          id_soumission: soumissionIdRef.current ?? undefined,
          ...(texte ? { commentaire: texte } : {}),
          ...(tel ? { telephone: normaliserTelephone(tel) } : {}),
        }).catch(() => undefined);
      }
    }
    for (const r of [delaiRef, avanceRef, resetRef]) {
      if (r.current) {
        clearTimeout(r.current);
        r.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accessibilité : le focus suit le titre à chaque étape/question.
  useEffect(() => {
    titreRef.current?.focus({ preventScroll: true });
  }, [step, currentQuestionIndex]);

  const services = formDef?.services ?? [];

  // COHÉRENCE OPÉRATION (FIX 05/09) : quand une opération est sélectionnée
  // mais n'a pas de questions propres, le repli « critères par défaut » ne
  // doit contenir QUE le vivier « Non assignées » (critères actifs de
  // l'agence rattachés à AUCUNE opération du guichet). Le serveur n'accepte
  // avec une opération que ses questions + ce vivier.
  const idsRattaches = new Set<number>(
    (formDef?.services ?? []).flatMap((s: any) => (s.criteres ?? []).map((c: any) => c.id)),
  );
  const defaultCriteres = (formDef?.agencyCriteres ?? []).filter(
    (c: any) => !idsRattaches.has(c.id),
  );

  useEffect(() => {
    if (formDef) {
      const servicesDuGuichet = formDef.services ?? [];
      if (servicesDuGuichet.length === 1) {
        setSelectedService(servicesDuGuichet[0]);
        setStep('QUESTIONS');
      } else if (servicesDuGuichet.length === 0) {
        setStep('QUESTIONS');
      }
    }
  }, [formDef]);

  // ── Effets de cycle de vie (déclarés AVANT tout retour conditionnel) ──
  // Règles des hooks : un useEffect placé APRÈS un `if (…) return` est un bug
  // d'hooks conditionnels — React lève « Rendered more hooks than during the
  // previous render » dès que l'état passe de « chargement » à « contenu ».
  // C'était le cas ici : le parcours de collecte plantait au chargement du
  // questionnaire, et la base ne contenait aucune soumission (constat
  // indirect mais convergent). Les deux effets ci-dessous sont donc remontés
  // au-dessus des retours, et leurs fonctions utilisées en
  //  (hoistées) pour éviter toute référence avant déclaration.

  // Debounce T2 : rien n'est envoyé pendant la frappe.
  useEffect(() => {
    if (step !== 'COMMENT_STEP' || t1.etat !== 'envoye') return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    const texte = commentaire.trim();
    const tel = telephone.trim();
    if (!texte && !tel) return;
    autosaveRef.current = setTimeout(() => {
      autosaveRef.current = null;
      void sauvegarderT2(texte, tel);
    }, DELAI_AUTOSAVE_T2_MS);
    return () => {
      if (autosaveRef.current) {
        clearTimeout(autosaveRef.current);
        autosaveRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentaire, telephone, step, t1.etat]);

  // Borne partagée : reset automatique après Merci pour le client suivant.
  useEffect(() => {
    if (step !== 'SUCCESS') return;
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => {
      resetRef.current = null;
      resetAll();
    }, DELAI_RESET_BORNE_MS);
    return () => {
      if (resetRef.current) {
        clearTimeout(resetRef.current);
        resetRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (isLoading) {
    return (
      <AmbientBackground>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary-strong" />
          <p className="text-sm font-bold text-muted-foreground mt-4">Chargement du questionnaire...</p>
        </div>
      </AmbientBackground>
    );
  }

  // C4 : identifiant invalide (dont ex-ID numérique) → même 404 que code
  // inconnu ou guichet désactivé. Pas d'oracle existe/n'existe pas.
  const identifiantInvalide = !codePublic;
  if (identifiantInvalide || isError || !formDef) {
    return (
      <AmbientBackground>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-sm p-8 text-center border-destructive/30">
            <p className="text-sm font-bold text-destructive-strong">Le guichet demandé n'existe pas ou a été désactivé.</p>
          </Card>
        </div>
      </AmbientBackground>
    );
  }

  const criteres = selectedService?.criteres?.length
    ? selectedService.criteres
    : defaultCriteres;

  const currentCritere = criteres[currentQuestionIndex];
  const questionnaireDisponible = criteres.length > 0;

  const messageErreurSubmit = (err: any): string => {
    const message = String(err?.message ?? '');
    // Le serveur renvoie déjà des 400 actionnables (option indisponible…).
    if (message.includes('status code 500') || message.includes('Request failed')) {
      return "Nous ne pouvons pas enregistrer votre avis pour le moment. Veuillez réessayer dans quelques instants.";
    }
    return message || "Une erreur est survenue lors de la soumission de votre avis. Veuillez réessayer.";
  };

  function resetAll() {
    annulerDelais();
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setCommentaire('');
    setTexteReponseCourante('');
    setCasesSelectionnes([]);
    setTelephone('');
    soumissionIdRef.current = null;
    dernierSaveT2Ref.current = null;
    setT1({ etat: 'attente', erreur: null });
    setT2({ etat: 'idle', erreur: null });
    setAccuse(null);
    setChoixEnCours(null);
    if (services.length === 1) {
      setSelectedService(services[0]);
      setStep('QUESTIONS');
    } else if (services.length === 0) {
      setStep('QUESTIONS');
    } else {
      setSelectedService(null);
      setStep('SERVICE_SELECT');
    }
  };

  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    setStep('QUESTIONS');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setT1({ etat: 'attente', erreur: null });
  };

  // Signal négatif direct (SMILEY ≤ 2, Non, bas d'échelle/NPS) : pas de
  // confetti. Les QCM/CASES/TEXTE ne votent jamais ici (pas de note connue
  // côté client — le serveur tranche).
  const estReponseNegative = (a: ReponseCollecte): boolean => {
    if (a.score !== undefined && a.score <= 2) return true;
    if (a.valeurOui === false) return true;
    if (a.valeur !== undefined) {
      const crit = criteres.find((c: any) => c.id === a.critereId);
      if (crit?.type_reponse === 'NPS') return a.valeur <= 6;
      const { min } = bornesEchelle(crit);
      return a.valeur <= min + 1;
    }
    return false;
  };

  const peutReduireMouvement =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // T1 — soumission AUTOMATIQUE des notes dès la dernière réponse.
  // Idempotent (même UUID en cas de réessai) : une reprise réseau ne crée
  // jamais deux avis. Le commentaire/téléphone suivent en T2.
  const soumettreT1 = async (liste?: ReponseCollecte[]) => {
    const base = liste ?? answers;
    if (t1.etat === 'encours') return;
    const reponsesRenseignees = base.filter((a) => a && a.critereId !== undefined);
    if (reponsesRenseignees.length === 0) {
      setT1({ etat: 'erreur', erreur: 'Veuillez répondre à au moins une question.' });
      return;
    }
    // Vague 1 (P7) : `crypto.randomUUID()` n'existe pas en contexte non
    // sécurisé — c'est le cas d'une borne servie en HTTP sur un réseau local,
    // qui est le déploiement de référence de ce produit. L'appel était hors du
    // try : le client restait bloqué sur sa dernière question, sans message,
    // sans spinner, sans issue. On encapsule et on retombe sur un identifiant
    // toujours disponible (l'idempotence reste garantie côté serveur par le
    // verrou consultatif, même si un UUID faible était deviné).
    if (!soumissionIdRef.current) {
      soumissionIdRef.current = genererIdSoumission();
    }
    setT1({ etat: 'encours', erreur: null });

    try {
      await soumettreAvis({
        // Vague 1 (P1) : le code opaque est le SEUL identifiant transmis.
        // L'identifiant numérique du guichet n'est plus ni renvoyé par la
        // query ni accepté par l'action : c'est ce qui rendait possible une
        // écriture dans le guichet d'une autre entreprise.
        code_public: codePublic || undefined,
        canalId: 1, // QR_WEB
        commentaire: '',
        telephone: undefined,
        serviceId: selectedService?.id || undefined,
        responses: reponsesRenseignees,
        id_soumission: soumissionIdRef.current,
      });

      const negatif = reponsesRenseignees.some(estReponseNegative);
      if (!negatif && !peutReduireMouvement) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      setT1({ etat: 'envoye', erreur: null });
      setStep('COMMENT_STEP');
    } catch (err: any) {
      if ((import.meta as any).env?.DEV) {
        console.error("Erreur lors de la soumission de l'avis:", err);
      }
      setT1({ etat: 'erreur', erreur: messageErreurSubmit(err) });
    }
  };

  // T2 — commentaire/téléphone auto-sauvés sur la MÊME soumission (30 min).
  // Si le client quitte après T1, ses notes sont déjà enregistrées.
  // Retourne `true` si le commentaire est persisté (ou s'il n'y avait rien à
  // envoyer) — le retour permet à « Passer » de ne pas avancer si l'envoi a
  // échoué, plutôt que de perdre la saisie.
  async function sauvegarderT2(texte: string, tel: string): Promise<boolean> {
    const idSoumission = soumissionIdRef.current;
    if (!idSoumission || t1.etat !== 'envoye') return true;
    const signature = JSON.stringify([texte, tel]);
    if (dernierSaveT2Ref.current === signature) return true;
    if (!texte && !tel) return true;
    setT2({ etat: 'saving', erreur: null });
    try {
      await completerSoumission({
        id_soumission: idSoumission,
        ...(texte ? { commentaire: texte } : {}),
        ...(tel ? { telephone: normaliserTelephone(tel) } : {}),
      });
      dernierSaveT2Ref.current = signature;
      setT2({ etat: 'saved', erreur: null });
      // Avance auto vers Merci après l'accusé « Enregistré ».
      if (avanceRef.current) clearTimeout(avanceRef.current);
      avanceRef.current = setTimeout(() => {
        avanceRef.current = null;
        setStep('SUCCESS');
      }, DELAI_AVANCE_APRES_SAVE_MS);
      return true;
    } catch (err: any) {
      if ((import.meta as any).env?.DEV) {
        console.error("Erreur lors de l'enregistrement du commentaire:", err);
      }
      setT2({ etat: 'error', erreur: messageErreurSubmit(err) });
      return false;
    }
  };


  const avancer = (reponse: ReponseCollecte) => {
    const nouvelles = [...answers];
    nouvelles[currentQuestionIndex] = reponse;
    setAnswers(nouvelles);
    if (currentQuestionIndex < criteres.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Dernière réponse → T1 automatique, aucun bouton.
      void soumettreT1(nouvelles);
    }
  };

  const handleSkip = () => {
    if (currentQuestionIndex < criteres.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      void soumettreT1();
    }
  };

  // Réponse avec accusé visuel : le client VOIT son choix (note ou libellé)
  // 500 ms avant d'avancer. Anti double-tap : tout second appui pendant
  // l'accusé est ignoré.
  const repondreAvecAccuse = (
    reponse: ReponseCollecte,
    cleChoix: string,
    accuseTexte: string,
    accuseIcone?: React.ReactNode,
  ) => {
    if (accuse !== null) return;
    setChoixEnCours(cleChoix);
    setAccuse({ texte: accuseTexte, icone: accuseIcone });
    if (delaiRef.current) clearTimeout(delaiRef.current);
    delaiRef.current = setTimeout(() => {
      delaiRef.current = null;
      setAccuse(null);
      setChoixEnCours(null);
      avancer(reponse);
    }, DELAI_ACCUSE_MS);
  };

  // Après T1, le questionnaire est verrouillé (notes déjà enregistrées) :
  // pas de retour arrière depuis le commentaire ni le succès.
  const canGoBack =
    step === 'QUESTIONS' && (currentQuestionIndex > 0 || services.length > 1);

  const handleBack = () => {
    if (delaiRef.current) {
      clearTimeout(delaiRef.current);
      delaiRef.current = null;
    }
    setAccuse(null);
    setChoixEnCours(null);
    if (step === 'QUESTIONS') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } else if (services.length > 1) {
        setStep('SERVICE_SELECT');
        setSelectedService(null);
      }
    }
  };

  // Vague 1 (P13) : « Passer » NE DOIT PLUS JETER le commentaire en cours.
  // L'ancien code annulait le debounce d'autosave sans rien envoyer : un
  // client qui écrivait puis cliquait « Passer » dans les 900 ms perdait son
  // texte silencieusement. On force donc l'envoi immédiat avant l'écran de
  // remerciement.
  const passerAuMerci = async () => {
    const texte = commentaire.trim();
    const tel = telephone.trim();
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
      autosaveRef.current = null;
    }
    if (avanceRef.current) {
      clearTimeout(avanceRef.current);
      avanceRef.current = null;
    }
    if (texte || tel) {
      // Échec de cet envoi : on reste sur l'étape commentaire avec le
      // message d'erreur — jamais de passage à « Merci » en perdant le texte.
      const ok = await sauvegarderT2(texte, tel);
      if (!ok) return;
    }
    if (avanceRef.current) {
      clearTimeout(avanceRef.current);
      avanceRef.current = null;
    }
    setStep('SUCCESS');
  };

  return (
    <AmbientBackground className="">
      <div className="flex min-h-[100dvh] w-full max-w-lg mx-auto flex-col justify-between px-3 py-3 sm:px-6 overflow-x-hidden">
        {/* Header */}
        <header className="w-full flex items-center justify-between py-2 sm:py-4 px-1">
          {canGoBack ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground rounded-xl min-h-11 cursor-pointer"
            >
              <ArrowLeft size={16} className="mr-1" aria-hidden /> Retour
            </Button>
          ) : (
            <span className="size-11" aria-hidden />
          )}
          <div className="text-right ml-auto">
            {marque?.logo_url ? (
              <img
                src={marque.logo_url}
                alt={marque.platform_name}
                className="h-9 max-w-[140px] object-contain"
              />
            ) : (
              <span className="text-xs font-bold uppercase tracking-widest text-primary-strong font-satoshi">
                {marque?.platform_name || "Yéba"}
              </span>
            )}
          </div>
        </header>

        {/* Main Content Card */}
        <div className="w-full flex-1 flex items-center justify-center my-auto py-2">
          <AnimatePresence mode="wait" initial={false}>
            {step === 'SERVICE_SELECT' && services.length > 1 && (
              <motion.div
                key="service_select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION}
                className="w-full"
              >
                <Card variant="feature" className="w-full p-6 sm:p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card">
                  <div>
                    <Eyebrow tone="amber">

                      {formDef.guichetName}
                    </Eyebrow>
                    <h1 ref={titreRef} tabIndex={-1} className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-satoshi outline-none">
                      {marque?.form_title || "Bienvenue au guichet"}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-2 font-medium max-w-sm mx-auto">
                      {marque?.form_subtitle || "Quelle opération venez-vous d'effectuer ?"}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1.5 text-[11px] font-bold text-secondary mx-auto">
                    <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                    Avis anonyme · données protégées
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    {services.map((service: ServiceType) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleServiceSelect(service)}
                        className={`w-full p-4 text-left rounded-2xl border border-border/80 bg-background hover:bg-muted hover:border-primary/50 shadow-sm transition-colors flex items-center justify-between group ${BTN_BASE} min-h-[52px]`}
                      >
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {service.libelle_service}
                        </span>
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">
                    Votre avis nous permet d'améliorer notre qualité de service
                  </p>
                </Card>
              </motion.div>
            )}

            {step === 'QUESTIONS' && !questionnaireDisponible && (
              <motion.div
                key="questionnaire-indisponible"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full"
              >
                <Card className="w-full p-6 sm:p-8 text-center space-y-3 rounded-3xl">
                  <h1 ref={titreRef} tabIndex={-1} className="text-xl font-bold text-foreground font-satoshi outline-none">Questionnaire momentanément indisponible</h1>
                  <p className="text-sm text-muted-foreground">
                    Aucun critère n’est encore configuré pour ce guichet. Merci de contacter l’agence.
                  </p>
                </Card>
              </motion.div>
            )}

            {step === 'QUESTIONS' && questionnaireDisponible && currentCritere && (
              <motion.div
                key={`question_${currentQuestionIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION}
                className="w-full"
              >
                <Card variant="feature" className="w-full p-6 sm:p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card">
                  {/* Progress bar */}
                  <div
                    className="w-full bg-muted/80 h-2 rounded-full overflow-hidden border border-border/40"
                    role="progressbar"
                    aria-label="Progression du questionnaire"
                    aria-valuemin={1}
                    aria-valuemax={criteres.length}
                    aria-valuenow={currentQuestionIndex + 1}
                  >
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / criteres.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="truncate max-w-[180px]">{selectedService?.libelle_service || "Évaluation"}</span>
                    <span className="shrink-0">{currentQuestionIndex + 1} / {criteres.length}</span>
                  </div>

                  <div className="space-y-2">
                    <h2 ref={titreRef} tabIndex={-1} className="text-xl sm:text-2xl font-bold text-foreground leading-tight font-satoshi outline-none">
                      {currentCritere.libelle_critere}
                    </h2>
                    {currentCritere.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                        {currentCritere.description}
                      </p>
                    )}
                  </div>

                  {/* Vague 4 (4.1.3) : la zone d'erreur est TOUJOURS montée —
                      une région role="alert" insérée au moment de l'échec n'est
                      pas annoncée de façon fiable. Le contenu, lui, reste
                      conditionnel ; hors erreur, la zone est vide et
                      transparente. */}
                  <div
                    role="alert"
                    className={`rounded-2xl border p-3 text-xs font-bold space-y-2 ${
                      t1.etat === 'erreur'
                        ? 'bg-destructive/10 border-destructive/25 text-destructive-strong'
                        : 'border-transparent bg-transparent'
                    }`}
                  >
                    {t1.etat === 'erreur' && (
                      <>
                        <p>{t1.erreur}</p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void soumettreT1()}
                          className="rounded-xl font-bold"
                        >
                          Réessayer l'envoi
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Smiley Input — accusé visuel : le choix s'agrandit et
                      s'entoure avant la transition (repondreAvecAccuse).
                      Vague 4 : role=radiogroup + flèches (2.1.1 / 4.1.2). */}
                  {currentCritere.type_reponse === 'SMILEY' && (
                    <div
                      role="radiogroup"
                      aria-label={currentCritere.libelle_critere || 'Satisfaction'}
                      className="flex justify-between items-center gap-1 sm:gap-2 pt-3 w-full min-w-0"
                    >
                      {NOTE_CONFIG.map((s, position) => {
                        const choisi = choixEnCours === `smiley-${s.note}`;
                        return (
                          <motion.button
                            key={s.note}
                            type="button"
                            role="radio"
                            aria-checked={choisi}
                            onKeyDown={(e) =>
                              deplacerChoix(e, position, NOTE_CONFIG.length, (i) => {
                                const cible = NOTE_CONFIG[i];
                                void repondreAvecAccuse(
                                  payloadSmiley(currentCritere.id, cible.note),
                                  `smiley-${cible.note}`,
                                  `${cible.label} — note ${cible.note} sur 5`,
                                  cible.icon,
                                );
                              })
                            }
                            onClick={() => repondreAvecAccuse(payloadSmiley(currentCritere.id, s.note), `smiley-${s.note}`, `${s.label} — note ${s.note} sur 5`, s.icon)}
                            aria-label={`${s.label} — note ${s.note} sur 5`}
                            animate={choisi ? { scale: 1.25 } : { scale: 1 }}
                            transition={peutReduireMouvement ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 18 }}
                            className={`text-3xl sm:text-4xl p-2 sm:p-3 flex-1 max-w-[72px] min-h-[52px] min-w-[44px] flex justify-center items-center rounded-2xl border transition-colors ${BTN_BASE} ${
                              choisi
                                ? 'bg-primary/15 border-primary shadow-md'
                                : 'border-transparent hover:bg-muted/80 hover:border-border/60'
                            }`}
                          >
                            {s.icon}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* Oui/Non Input — valeurOui + orientation gérée serveur.
                      Vague 4 : role=radiogroup + flèches (2.1.1 / 4.1.2). */}
                  {currentCritere.type_reponse === 'OUI_NON' && (
                    <div
                      role="radiogroup"
                      aria-label={currentCritere.libelle_critere || 'Réponse'}
                      className="grid grid-cols-2 gap-3 sm:gap-4 pt-2"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={choixEnCours === 'ouinon-oui'}
                        onKeyDown={(e) =>
                          deplacerChoix(e, 0, 2, (i) => {
                            const estOui = i === 0;
                            void repondreAvecAccuse(
                              payloadOuiNon(currentCritere.id, estOui),
                              estOui ? 'ouinon-oui' : 'ouinon-non',
                              estOui ? 'Oui' : 'Non',
                              <span className="text-3xl" aria-hidden>{estOui ? '👍' : '👎'}</span>,
                            );
                          })
                        }
                        onClick={() => repondreAvecAccuse(payloadOuiNon(currentCritere.id, true), 'ouinon-oui', 'Oui', <span className="text-3xl" aria-hidden>👍</span>)}
                        className={`font-bold py-5 rounded-2xl text-base sm:text-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-sm min-h-[88px] border ${BTN_BASE} ${
                          choixEnCours === 'ouinon-oui'
                            ? 'bg-success/25 border-success text-success-strong'
                            : 'bg-success/10 hover:bg-success/20 text-success-strong border-success/30'
                        }`}
                      >
                        <span className="text-3xl" aria-hidden>👍</span>
                        <span>Oui</span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={choixEnCours === 'ouinon-non'}
                        onKeyDown={(e) =>
                          deplacerChoix(e, 1, 2, (i) => {
                            const estOui = i === 0;
                            void repondreAvecAccuse(
                              payloadOuiNon(currentCritere.id, estOui),
                              estOui ? 'ouinon-oui' : 'ouinon-non',
                              estOui ? 'Oui' : 'Non',
                              <span className="text-3xl" aria-hidden>{estOui ? '👍' : '👎'}</span>,
                            );
                          })
                        }
                        onClick={() => repondreAvecAccuse(payloadOuiNon(currentCritere.id, false), 'ouinon-non', 'Non', <span className="text-3xl" aria-hidden>👎</span>)}
                        className={`font-bold py-5 rounded-2xl text-base sm:text-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-sm min-h-[88px] border ${BTN_BASE} ${
                          choixEnCours === 'ouinon-non'
                            ? 'bg-destructive/25 border-destructive text-destructive-strong'
                            : 'bg-destructive/10 hover:bg-destructive/20 text-destructive-strong border-destructive/30'
                        }`}
                      >
                        <span className="text-3xl" aria-hidden>👎</span>
                        <span>Non</span>
                      </button>
                    </div>
                  )}

                  {/* QCM Input — optionId stable (jamais de position). */}
                  {currentCritere.type_reponse === 'QCM' && (
                    <div
                      role="radiogroup"
                      aria-label={currentCritere.libelle_critere || 'Question à choix unique'}
                      className="flex flex-col gap-2.5 pt-2"
                    >
                      {(() => {
                        const options = optionsAffichage(currentCritere);
                        return options.map((choix, position) => {
                          const cle = choix.id ?? `t:${choix.libelle}`;
                          const choisi = choixEnCours === cle;
                          return (
                          <button
                            key={cle}
                            type="button"
                            role="radio"
                            aria-checked={choisi}
                            onKeyDown={(e) =>
                              deplacerChoix(e, position, options.length, (i) => {
                                const cible = options[i];
                                const cleCible = cible.id ?? `t:${cible.libelle}`;
                                void repondreAvecAccuse(
                                  payloadQCM(currentCritere.id, cible),
                                  cleCible,
                                  cible.libelle,
                                  <span aria-hidden>✓</span>,
                                );
                              })
                            }
                            onClick={() => repondreAvecAccuse(payloadQCM(currentCritere.id, choix), cle, choix.libelle, <span aria-hidden>✓</span>)}
                            className={`w-full text-left p-4 border rounded-2xl text-sm font-bold transition-colors flex items-center gap-3 min-h-[52px] ${BTN_BASE} ${
                              choisi
                                ? 'border-primary bg-primary/15 text-primary-strong'
                                : 'border-border/80 hover:bg-muted text-foreground'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0" aria-hidden />
                            <span>{choix.libelle}</span>
                          </button>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {/* Text Input — verbatim seul, jamais de note. */}
                  {currentCritere.type_reponse === 'TEXTE' && (
                    <div className="space-y-4 pt-2">
                      <Textarea
                        value={texteReponseCourante}
                        placeholder="Votre réponse ici..."
                        rows={4}
                        maxLength={1000}
                        className="text-base text-left rounded-2xl border-border/80"
                        onChange={(e) => setTexteReponseCourante(e.target.value)}
                      />
                      <Button
                        onClick={() => avancer(payloadTexte(currentCritere.id, texteReponseCourante.trim()))}
                        disabled={texteReponseCourante.trim().length === 0}
                        className="w-full py-6 rounded-2xl text-base font-bold shadow-sm"
                      >
                        Continuer <ChevronRight size={18} className="ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Échelle linéaire — valeur brute, bornes validées serveur.
                      Phase L : si le critère est un CES, les boutons portent
                      les libellés d'effort (« Très facile »…) au lieu des
                      chiffres ; la valeur transmise reste la note brute. */}
                  {currentCritere.type_reponse === 'ECHELLE' && (() => {
                    const { min, max } = bornesEchelle(currentCritere);
                    const choix = choixEchelle(currentCritere);
                    const labelsLongs = choix.some((c) => c.libelle.length > 3);
                    const colsClass = choix.length <= 5
                      ? 'grid-cols-5'
                      : labelsLongs
                        ? 'grid-cols-2 sm:grid-cols-4'
                        : 'grid-cols-4 sm:grid-cols-8';
                    return (
                      <div
                        role="radiogroup"
                        aria-label={currentCritere.libelle_critere || 'Note'}
                        className={`grid ${colsClass} gap-2 pt-2 w-full min-w-0`}
                      >
                        {choix.map((c, position) => (
                          <button
                            key={c.valeur}
                            type="button"
                            role="radio"
                            aria-checked={choixEnCours === `echelle-${c.valeur}`}
                            onKeyDown={(e) =>
                              deplacerChoix(e, position, choix.length, (i) => {
                                const cible = choix[i];
                                void repondreAvecAccuse(
                                  payloadValeur(currentCritere.id, cible.valeur),
                                  `echelle-${cible.valeur}`,
                                  cible.libelle,
                                );
                              })
                            }
                            onClick={() => repondreAvecAccuse(payloadValeur(currentCritere.id, c.valeur), `echelle-${c.valeur}`, c.libelle)}
                            aria-label={c.aria}
                            className={`w-full rounded-2xl border font-bold transition-colors flex items-center justify-center text-center font-satoshi ${BTN_BASE} ${
                              labelsLongs ? 'h-auto min-h-[64px] px-2 py-2.5 text-[11px] sm:text-xs leading-tight' : 'h-12 text-base'
                            } ${
                              choixEnCours === `echelle-${c.valeur}`
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'border-border/80 bg-background hover:bg-primary/15 hover:border-primary/50 text-foreground'
                            }`}
                          >
                            {c.libelle}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* NPS natif 0-10 (détracteurs / passifs / promoteurs).
                      Vague 4 : radiogroup + flèches. Sans cela, il faut
                      11 tabulations pour atteindre « 10 ». */}
                  {currentCritere.type_reponse === 'NPS' && (
                    <div className="pt-2 space-y-3">
                      <div
                        role="radiogroup"
                        aria-label={currentCritere.libelle_critere || 'Recommandation'}
                        className="grid grid-cols-6 sm:grid-cols-11 gap-2 w-full min-w-0"
                      >
                        {Array.from({ length: 11 }, (_, v) => v).map((v, position) => (
                          <button
                            key={v}
                            type="button"
                            role="radio"
                            aria-checked={choixEnCours === `nps-${v}`}
                            onKeyDown={(e) =>
                              deplacerChoix(e, position, 11, (i) => {
                                void repondreAvecAccuse(
                                  payloadValeur(currentCritere.id, i),
                                  `nps-${i}`,
                                  `Note ${i} sur 10`,
                                );
                              })
                            }
                            onClick={() => repondreAvecAccuse(payloadValeur(currentCritere.id, v), `nps-${v}`, `Note ${v} sur 10`)}
                            aria-label={`Note ${v} sur 10`}
                            className={`w-full h-12 rounded-2xl border text-base font-bold transition-colors flex items-center justify-center font-satoshi ${BTN_BASE} ${
                              choixEnCours === `nps-${v}`
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'border-border/80 bg-background hover:bg-primary/15 hover:border-primary/50 text-foreground'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Pas du tout probable</span>
                        <span>Très probable</span>
                      </div>
                    </div>
                  )}

                  {/* Choix multiples — optionIds stables. Vague 4 : le groupe
                      porte un nom accessible ; chaque option reste un bouton
                      à bascule (`aria-pressed`), le motif ARIA correct pour
                      une sélection multiple. */}
                  {currentCritere.type_reponse === 'CASES' && (
                    <div className="space-y-4 pt-2">
                      <div
                        role="group"
                        aria-label={`${currentCritere.libelle_critere || 'Question'} — plusieurs réponses possibles`}
                        className="flex flex-col gap-2"
                      >
                        {optionsAffichage(currentCritere).map((choix) => {
                          const cle = choix.id ?? `t:${choix.libelle}`;
                          const checked = casesSelectionnes.some((c) => (c.id ?? `t:${c.libelle}`) === cle);
                          return (
                            <button
                              key={cle}
                              type="button"
                              onClick={() =>
                                setCasesSelectionnes((prev) =>
                                  checked
                                    ? prev.filter((c) => (c.id ?? `t:${c.libelle}`) !== cle)
                                    : [...prev, choix]
                                )
                              }
                              aria-pressed={checked}
                              className={`w-full text-left p-4 border rounded-2xl text-sm font-bold transition-colors flex items-center gap-3 min-h-[52px] ${BTN_BASE} ${
                                checked
                                  ? 'border-primary bg-primary/15 text-primary-strong'
                                  : 'border-border/80 hover:bg-muted text-foreground'
                              }`}
                            >
                              <span
                                className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                  checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                                }`}
                              >
                                {checked && '✓'}
                              </span>
                              <span>{choix.libelle}</span>
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        onClick={() => avancer(payloadCases(currentCritere.id, casesSelectionnes))}
                        disabled={casesSelectionnes.length === 0}
                        className="w-full py-6 rounded-2xl text-base font-bold shadow-sm"
                      >
                        Continuer <ChevronRight size={18} className="ml-1" />
                      </Button>
                    </div>
                  )}

                  {currentCritere.obligatoire === false && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleSkip}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground"
                    >
                      Passer cette question
                    </Button>
                  )}
                </Card>
              </motion.div>
            )}

            {/* T2 — « Une dernière chose ? » : commentaire/téléphone
                auto-sauvés sur la même soumission. AUCUN bouton d'envoi :
                sauvegarde débouncée + avance auto, ou lien Passer. */}
            {step === 'COMMENT_STEP' && (
              <motion.div
                key="comment_step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION}
                className="w-full"
              >
                <Card variant="feature" className="w-full p-6 sm:p-8 space-y-4 shadow-premium-lg rounded-3xl bg-card">
                  <div className="text-center space-y-1">
                    <h2 ref={titreRef} tabIndex={-1} className="text-xl sm:text-2xl font-bold text-foreground font-satoshi outline-none">
                      Une dernière chose ?
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">
                      Un commentaire peut nous aider à améliorer votre expérience.
                    </p>
                  </div>

                  <div className="space-y-4 pt-1">
                    {/* Vague 4 (1.3.1 / 3.3.2 / 4.1.2) : le <label> est
                        réellement associé au champ. Auparavant il n'était
                        qu'un <span> stylé : le nom accessible retombait sur
                        le placeholder, qui disparaît dès la saisie. */}
                    <div className="text-left space-y-1.5">
                      <label
                        htmlFor="avis-commentaire"
                        className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"
                      >
                        <MessageSquare size={13} aria-hidden /> Écrivez librement… (facultatif)
                      </label>
                      <Textarea
                        id="avis-commentaire"
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                        placeholder="Des détails à partager ? Un problème rencontré ?"
                        rows={3}
                        maxLength={1000}
                        aria-describedby="avis-commentaire-aide"
                        className="text-base rounded-2xl border-border/80"
                      />
                      <p id="avis-commentaire-aide" className="text-[11px] text-muted-foreground leading-tight font-medium">
                        Facultatif — votre commentaire aide l’équipe à améliorer le service.
                      </p>
                    </div>

                    <div className="text-left space-y-1.5">
                      <label
                        htmlFor="avis-telephone"
                        className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"
                      >
                        <Phone size={13} aria-hidden /> Téléphone (facultatif)
                      </label>
                      <Input
                        id="avis-telephone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        placeholder="Ex: +225 0700000000"
                        aria-describedby="avis-telephone-aide"
                        className="h-12 rounded-2xl px-4 text-base border-border/80"
                      />
                      <p id="avis-telephone-aide" className="text-[11px] text-muted-foreground leading-tight font-medium">
                        Facultatif — votre numéro sera haché (SHA-256) pour éviter les doublons et ne sera jamais partagé.
                      </p>
                    </div>

                    <div aria-live="polite" className="min-h-5 text-center">
                      {t2.etat === 'saving' && (
                        <p className="text-xs font-bold text-muted-foreground inline-flex items-center gap-1.5">
                          <Loader2 size={13} className="animate-spin" /> Enregistrement…
                        </p>
                      )}
                      {t2.etat === 'saved' && (
                        <p className="text-xs font-bold text-success-strong">Enregistré ✓</p>
                      )}
                      {t2.etat === 'error' && (
                        <p className="text-xs font-bold text-destructive-strong">
                          <span>{t2.erreur}</span>
                          {/* Vague 4 (2.5.8) : cible tactile ≥ 24 px CSS
                              (ici 44 px, valeur mobile recommandée). Le
                              bouton inline d'origine mesurait ~16 px. */}
                          <button
                            type="button"
                            onClick={() => {
                              dernierSaveT2Ref.current = null;
                              setT2({ etat: 'idle', erreur: null });
                              void sauvegarderT2(commentaire.trim(), telephone.trim());
                            }}
                            className="mt-1 inline-flex min-h-11 items-center rounded-xl px-3 underline underline-offset-2 hover:bg-accent/60"
                          >
                            Réessayer
                          </button>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={passerAuMerci}
                      className="w-full min-h-11 text-center text-xs font-bold text-muted-foreground hover:text-foreground py-2"
                    >
                      Passer
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 'SUCCESS' && (
              <motion.div
                key="success_step"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={TRANSITION}
                className="w-full"
              >
                <Card variant="feature" className="w-full p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card">
                  <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto text-4xl shadow-sm border border-success/30">
                    🎉
                  </div>
                  <div className="space-y-2">
                    <h2 ref={titreRef} tabIndex={-1} className="text-2xl sm:text-3xl font-bold text-foreground font-satoshi outline-none">
                      {marque?.form_thank_you || "Merci pour votre avis !"}
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-[280px] mx-auto font-medium">
                      Votre retour précieux nous aide à améliorer constamment votre expérience au guichet.
                    </p>
                  </div>
                  {/* Récapitulatif : note quand elle existe, ✓ sinon. */}
                  {answers.filter((a) => a && a.critereId !== undefined).length > 0 && (
                    <ul className="space-y-2 rounded-2xl border border-border/60 bg-muted/40 p-4 text-left">
                      {answers.filter((a) => a && a.critereId !== undefined).map((a, i) => {
                        const crit = criteres.find((c: any) => c.id === a.critereId);
                        const note = typeof a.score === 'number' ? a.score
                          : typeof a.valeur === 'number' && crit?.type_reponse !== 'NPS' ? a.valeur
                          : null;
                        const ouiNon = typeof a.valeurOui === 'boolean' ? (a.valeurOui ? 'Oui' : 'Non') : null;
                        return (
                          <li key={i} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-semibold text-foreground">
                              {crit?.libelle_critere || `Question ${i + 1}`}
                            </span>
                            {note !== null ? (
                              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-bold">
                                <span className="text-base leading-none">{visuelPourNote(note).icon}</span>
                                {note}/5
                              </span>
                            ) : ouiNon !== null ? (
                              <span className="shrink-0 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-bold">
                                {ouiNon}
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-bold text-success-strong">
                                ✓ Répondu
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="pt-2 space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetAll}
                      className="rounded-2xl font-bold"
                    >
                      Nouvel avis
                    </Button>
                    <p className="text-xs text-muted-foreground font-medium">Vous pouvez fermer cet onglet en toute sécurité.</p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Barre basse : accusé du choix (note OU libellé) puis progression.
            Sticky : reste visible en scrollant. Masquée sur accueil/succès
            (le succès a son propre récapitulatif détaillé). */}
        {(step === 'QUESTIONS' || step === 'COMMENT_STEP') && (
          <div className="sticky bottom-3 z-20 mt-2">
            <AnimatePresence mode="wait" initial={false}>
              {step === 'QUESTIONS' ? (
                <motion.div key="questions" {...FADE_IN} className="space-y-2">
                  {/* Vague 4 (4.1.3) : la région live est montée en permanence
                      (sinon le texte inséré au moment du remplissage n'est pas
                      annoncé de façon fiable). Sans accusé, elle est masquée en
                      `sr-only` : présente dans l'arbre d'accessibilité, absente
                      de la maquette, donc sans décalage de mise en page. */}
                  <div
                    role="status"
                    aria-live="polite"
                    className={
                      accuse !== null
                        ? 'flex items-center justify-center gap-3 rounded-2xl border border-primary/40 bg-card/95 px-4 py-3 shadow-lg backdrop-blur'
                        : 'sr-only'
                    }
                  >
                    {accuse !== null && (
                      <>
                        <motion.span
                          initial={{ scale: 0.5 }}
                          animate={peutReduireMouvement ? { scale: 1 } : { scale: [0.5, 1.3, 1] }}
                          transition={peutReduireMouvement ? { duration: 0 } : { duration: 0.4 }}
                          className="text-3xl"
                          aria-hidden
                        >
                          {accuse.icone ?? '✓'}
                        </motion.span>
                        <span className="text-sm font-bold text-foreground">{accuse.texte}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-2.5 shadow-md backdrop-blur">
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {`Question ${Math.min(currentQuestionIndex + 1, criteres.length)}/${criteres.length}`}
                    </span>
                    <span className="flex items-center gap-1.5 overflow-hidden" aria-label="Réponses déjà données">
                      {criteres.map((_: any, i: number) => (
                        <IndicateurReponse
                          key={i}
                          reponse={answers[i]}
                          position={i}
                          total={criteres.length}
                          enCours={i === currentQuestionIndex}
                          peutReduireMouvement={peutReduireMouvement}
                        />
                      ))}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="progression"
                  {...FADE_IN}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-2.5 shadow-md backdrop-blur"
                >
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Vos notes
                  </span>
                  <span className="flex items-center gap-1.5 overflow-hidden" aria-label="Réponses déjà données">
                    {answers.map((rep: any, i: number) => (
                      <IndicateurReponse
                        key={i}
                        reponse={rep}
                        position={i}
                        total={answers.length}
                        enCours={false}
                        peutReduireMouvement={peutReduireMouvement}
                      />
                    ))}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Footer Branding */}
        {!marque?.hide_yeba_branding && (
          <div className="py-2 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Propulsé par {marque?.platform_name || "Yeba"}
            </p>
          </div>
        )}
      </div>
    </AmbientBackground>
  );
};
