import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, getFormDefinitionForGuichet, soumettreAvis } from 'wasp/client/operations';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import confetti from 'canvas-confetti';
import { ChevronRight, MessageSquare, Phone, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { AmbientBackground } from '../components/AmbientBackground';
import { Card, Eyebrow } from '../components/ds';
import { parseCollecteIdentifier } from '../collecte/routeParams';
// ---------- CONSTANTES HORS COMPOSANT (performance) ----------
// Toute valeur recréée à chaque render devient un nouvel objet/la même valeur
// mais une nouvelle FONCTION pour React → re-renders inutiles à chaque frappe.
// Déclarées ici : zéro allocation par frappe, références stables.
// Transition unique partagée par toutes les animations du formulaire.
// Durées courtes (0.18s) : réactivité perçue maximale au clic.
const TRANSITION = { duration: 0.18, ease: [0.16, 1, 0.3, 1] };
// Propriétés d'animation communes : opacity seul (composité GPU, ne déclenche
// ni layout ni paint — contrairement à x/y qui reflowent).
const FADE_IN = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: TRANSITION };
const SMILEYS = [
    { note: 1, icon: '😡', label: 'Très mécontent' },
    { note: 2, icon: '😟', label: 'Mécontent' },
    { note: 3, icon: '😐', label: 'Neutre' },
    { note: 4, icon: '🙂', label: 'Satisfait' },
    { note: 5, icon: '🤩', label: 'Très satisfait' },
];
// Styles statiques pré-calculés (pas de template-literals ré-évalués par frappe)
const BTN_BASE = 'cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';
const normaliserTelephone = (valeur) => {
    const chiffres = valeur.replace(/[^\d]/g, '');
    if (!chiffres)
        return '';
    if (chiffres.startsWith('225') && chiffres.length === 13)
        return `+${chiffres}`;
    if (chiffres.startsWith('00225'))
        return `+225${chiffres.slice(5)}`;
    return `+225${chiffres}`;
};
export const CollectePage = () => {
    // QR opaque (Doc 11 §7) : la route porte un code public non prédictible
    // (/q/BXYUUEHM9Y). Les vieux QR numériques (/q/12) restent supportés.
    // Le parsing centralisé (routeParams.ts, couvert par tests) distingue les
    // deux formes ; un identifiant vide ou invalide bloque le chargement.
    const params = useParams();
    const identifiantBrut = (params.code ?? params.guichetId ?? '').trim();
    const identifiant = parseCollecteIdentifier(identifiantBrut);
    const codePublic = identifiant?.kind === 'publicCode' ? identifiant.code : null;
    const idGuichetNum = identifiant?.kind === 'guichetId' ? identifiant.guichetId : NaN;
    const idGuichetValide = identifiant?.kind === 'guichetId';
    const { data: formDef, isLoading, isError } = useQuery(getFormDefinitionForGuichet, codePublic
        ? { code_public: codePublic }
        : { id_guichet: idGuichetValide ? idGuichetNum : 0 }, { enabled: !!codePublic || idGuichetValide });
    const { brandConfig } = useBrand();
    const [step, setStep] = useState('SERVICE_SELECT');
    const [selectedService, setSelectedService] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [commentaire, setCommentaire] = useState('');
    const [texteReponseCourante, setTexteReponseCourante] = useState('');
    const [casesSelectionnees, setCasesSelectionnees] = useState([]);
    const [telephone, setTelephone] = useState('');
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [erreur, setErreur] = useState(null);
    const soumissionIdRef = useRef(null);
    useEffect(() => {
        setTexteReponseCourante('');
        setCasesSelectionnees([]);
    }, [currentQuestionIndex, step]);
    const services = formDef?.services ?? [];
    // COHÉRENCE OPÉRATION (FIX 05/09) : quand une opération est sélectionnée
    // mais n'a pas de questions propres, le repli « critères par défaut » ne
    // doit contenir QUE le vivier « Non assignées » (critères actifs de
    // l'agence rattachés à AUCUNE opération du guichet). Le serveur n'accepte
    // avec une opération que ses questions + ce vivier.
    const idsRattaches = new Set((formDef?.services ?? []).flatMap((s) => (s.criteres ?? []).map((c) => c.id)));
    const defaultCriteres = (formDef?.agencyCriteres ?? []).filter((c) => !idsRattaches.has(c.id));
    useEffect(() => {
        if (formDef) {
            const servicesDuGuichet = formDef.services ?? [];
            if (servicesDuGuichet.length === 1) {
                setSelectedService(servicesDuGuichet[0]);
                setStep('QUESTIONS');
            }
            else if (servicesDuGuichet.length === 0) {
                setStep('QUESTIONS');
            }
        }
    }, [formDef]);
    if (isLoading) {
        return (<AmbientBackground>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary"/>
          <p className="text-sm font-bold text-muted-foreground mt-4">Chargement du questionnaire...</p>
        </div>
      </AmbientBackground>);
    }
    // FIX QR OPAQUE (05/09) : pour un QR code il n'y a pas d'id numérique —
    // seul le formDef chargé compte. L'ancien test sur idGuichetNum rejetait
    // TOUS les QR opaques avec "n'existe pas".
    const identifiantInvalide = !codePublic && (!idGuichetValide);
    if (identifiantInvalide || isError || !formDef) {
        return (<AmbientBackground>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-sm p-8 text-center border-destructive/30">
            <p className="text-sm font-bold text-destructive">Le guichet demandé n'existe pas ou a été désactivé.</p>
          </Card>
        </div>
      </AmbientBackground>);
    }
    const criteres = selectedService?.criteres?.length
        ? selectedService.criteres
        : defaultCriteres;
    const currentCritere = criteres[currentQuestionIndex];
    const questionnaireDisponible = criteres.length > 0;
    const handleServiceSelect = (service) => {
        setSelectedService(service);
        setStep('QUESTIONS');
        setCurrentQuestionIndex(0);
        setAnswers([]);
    };
    const handleAnswer = (score, texte) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = {
            critereId: currentCritere.id,
            score: score,
            ...(texte !== undefined ? { texte } : {}),
        };
        setAnswers(newAnswers);
        if (currentQuestionIndex < criteres.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
        else {
            setStep('COMMENT_STEP');
        }
    };
    const handleSkip = () => {
        if (currentQuestionIndex < criteres.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
        else {
            setStep('COMMENT_STEP');
        }
    };
    const canGoBack = step === 'COMMENT_STEP' ||
        (step === 'QUESTIONS' && (currentQuestionIndex > 0 || services.length > 1)) ||
        (step === 'SERVICE_SELECT' && selectedService !== null && services.length > 1);
    const handleBack = () => {
        if (step === 'COMMENT_STEP') {
            setStep('QUESTIONS');
            setCurrentQuestionIndex(criteres.length - 1);
        }
        else if (step === 'QUESTIONS') {
            if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(currentQuestionIndex - 1);
            }
            else if (services.length > 1) {
                setStep('SERVICE_SELECT');
                setSelectedService(null);
            }
        }
    };
    const finalSubmit = async () => {
        if (envoiEnCours)
            return;
        if (!soumissionIdRef.current)
            soumissionIdRef.current = crypto.randomUUID();
        setEnvoiEnCours(true);
        setErreur(null);
        try {
            const reponsesRenseignees = answers.filter((a) => a && a.critereId !== undefined);
            await soumettreAvis({
                // FIX QR OPAQUE (05/09) : pour un QR code, idGuichetNum vaut NaN
                // (pas de :guichetId dans l'URL) — on envoie le code_public que le
                // serveur résout, ou l'id renvoyé par le formDef.
                guichetId: idGuichetValide ? idGuichetNum : (formDef?.id_guichet || undefined),
                code_public: codePublic || undefined,
                canalId: 1, // QR_WEB
                commentaire: commentaire.trim(),
                telephone: telephone.trim() ? normaliserTelephone(telephone) : undefined,
                serviceId: selectedService?.id || undefined,
                responses: reponsesRenseignees,
                id_soumission: soumissionIdRef.current,
            });
            const idsCriteresNeutres = new Set(criteres.filter((c) => c.type_reponse === 'TEXTE' || c.type_reponse === 'CASES').map((c) => c.id));
            const scoresNotables = reponsesRenseignees
                .filter((a) => !idsCriteresNeutres.has(a.critereId))
                .map((a) => a.score);
            const minScore = scoresNotables.length > 0 ? Math.min(...scoresNotables) : 5;
            if (minScore >= 4) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            setStep('SUCCESS');
        }
        catch (err) {
            if (import.meta.env?.DEV) {
                console.error("Erreur lors de la soumission de l'avis:", err);
            }
            const message = String(err?.message ?? '');
            setErreur(message.includes('status code 500') || message.includes('Request failed')
                ? "Nous ne pouvons pas enregistrer votre avis pour le moment. Veuillez réessayer dans quelques instants."
                : message || "Une erreur est survenue lors de la soumission de votre avis. Veuillez réessayer.");
        }
        finally {
            setEnvoiEnCours(false);
        }
    };
    return (<AmbientBackground className="">
      <div className="flex min-h-[100dvh] w-full max-w-lg mx-auto flex-col justify-between px-3 py-3 sm:px-6 overflow-x-hidden">
        {/* Header */}
        <header className="w-full flex items-center justify-between py-2 sm:py-4 px-1">
          {canGoBack ? (<Button type="button" variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground hover:text-foreground rounded-xl min-h-11 cursor-pointer">
              <ArrowLeft size={16} className="mr-1" aria-hidden/> Retour
            </Button>) : (<span className="size-11" aria-hidden/>)}
          <div className="text-right ml-auto">
            {brandConfig?.logo_url ? (<img src={brandConfig.logo_url} alt={brandConfig.platform_name} className="h-9 max-w-[140px] object-contain"/>) : (<span className="text-xs font-bold uppercase tracking-widest text-primary font-satoshi">
                {brandConfig?.platform_name || "Yéba"}
              </span>)}
          </div>
        </header>

        {/* Main Content Card */}
        <div className="w-full flex-1 flex items-center justify-center my-auto py-2">
          <AnimatePresence mode="wait" initial={false}>
            {step === 'SERVICE_SELECT' && services.length > 1 && (<motion.div key="service_select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION} className="w-full">
                <Card variant="feature" className="w-full p-6 sm:p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card">
                  <div>
                    <Eyebrow tone="amber">

                      {formDef.guichetName}
                    </Eyebrow>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-satoshi">
                      {brandConfig?.form_title || "Bienvenue au guichet"}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-2 font-medium max-w-sm mx-auto">
                      {brandConfig?.form_subtitle || "Quelle opération venez-vous d'effectuer ?"}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1.5 text-[11px] font-bold text-secondary mx-auto">
                    <ShieldCheck className="size-3.5 shrink-0" aria-hidden/>
                    Avis anonyme · données protégées
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    {services.map((service) => (<button key={service.id} type="button" onClick={() => handleServiceSelect(service)} className={`w-full p-4 text-left rounded-2xl border border-border/80 bg-background hover:bg-muted hover:border-primary/50 shadow-sm transition-colors flex items-center justify-between group ${BTN_BASE} min-h-[52px]`}>
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {service.libelle_service}
                        </span>
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"/>
                      </button>))}
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">
                    Votre avis nous permet d'améliorer notre qualité de service
                  </p>
                </Card>
              </motion.div>)}

            {step === 'QUESTIONS' && !questionnaireDisponible && (<motion.div key="questionnaire-indisponible" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                <Card className="w-full p-6 sm:p-8 text-center space-y-3 rounded-3xl">
                  <h1 className="text-xl font-bold text-foreground font-satoshi">Questionnaire momentanément indisponible</h1>
                  <p className="text-sm text-muted-foreground">
                    Aucun critère n’est encore configuré pour ce guichet. Merci de contacter l’agence.
                  </p>
                </Card>
              </motion.div>)}

            {step === 'QUESTIONS' && questionnaireDisponible && currentCritere && (<motion.div key={`question_${currentQuestionIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION} className="w-full">
                <Card variant="feature" className="w-full p-6 sm:p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card">
                  {/* Progress bar */}
                  <div className="w-full bg-muted/80 h-2 rounded-full overflow-hidden border border-border/40" role="progressbar" aria-label="Progression du questionnaire" aria-valuemin={1} aria-valuemax={criteres.length} aria-valuenow={currentQuestionIndex + 1}>
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / criteres.length) * 100}%` }}/>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="truncate max-w-[180px]">{selectedService?.libelle_service || "Évaluation"}</span>
                    <span className="shrink-0">{currentQuestionIndex + 1} / {criteres.length}</span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight font-satoshi">
                      {currentCritere.libelle_critere}
                    </h2>
                    {currentCritere.description && (<p className="text-xs sm:text-sm text-muted-foreground font-medium">
                        {currentCritere.description}
                      </p>)}
                  </div>

                  {/* Smiley Input */}
                  {currentCritere.type_reponse === 'SMILEY' && (<div className="flex justify-between items-center gap-1 sm:gap-2 pt-3 w-full min-w-0">
                      {SMILEYS.map((s) => (<button key={s.note} type="button" onClick={() => handleAnswer(s.note)} aria-label={s.label} className={`text-3xl sm:text-4xl p-2 sm:p-3 flex-1 max-w-[72px] min-h-[52px] min-w-[44px] flex justify-center items-center rounded-2xl hover:bg-muted/80 border border-transparent hover:border-border/60 transition-transform hover:scale-110 active:scale-95 ${BTN_BASE}`}>
                          {s.icon}
                        </button>))}
                    </div>)}

                  {/* Oui/Non Input */}
                  {currentCritere.type_reponse === 'OUI_NON' && (<div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                      <button type="button" onClick={() => handleAnswer(5)} className={`bg-success/10 hover:bg-success/20 text-success border border-success/30 font-bold py-5 rounded-2xl text-base sm:text-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-sm min-h-[88px] ${BTN_BASE}`}>
                        <span className="text-3xl">👍</span>
                        <span>Oui</span>
                      </button>
                      <button type="button" onClick={() => handleAnswer(1)} className={`bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 font-bold py-5 rounded-2xl text-base sm:text-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-sm min-h-[88px] ${BTN_BASE}`}>
                        <span className="text-3xl">👎</span>
                        <span>Non</span>
                      </button>
                    </div>)}

                  {/* QCM Input */}
                  {currentCritere.type_reponse === 'QCM' && (<div className="flex flex-col gap-2.5 pt-2">
                      {currentCritere.options_reponse?.split(',').map((option, index) => (<button key={index} type="button" onClick={() => handleAnswer(index + 1)} className={`w-full text-left p-4 border border-border/80 rounded-2xl hover:bg-muted text-foreground text-sm font-bold transition-colors flex items-center gap-3 min-h-[52px] ${BTN_BASE}`}>
                          <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0"/>
                          <span>{option.trim()}</span>
                        </button>))}
                    </div>)}

                  {/* Text Input */}
                  {currentCritere.type_reponse === 'TEXTE' && (<div className="space-y-4 pt-2">
                      <Textarea value={texteReponseCourante} placeholder="Votre réponse ici..." rows={4} maxLength={1000} className="text-base text-left rounded-2xl border-border/80" onChange={(e) => setTexteReponseCourante(e.target.value)}/>
                      <Button onClick={() => handleAnswer(3, texteReponseCourante.trim())} disabled={texteReponseCourante.trim().length === 0} className="w-full py-6 rounded-2xl text-base font-bold shadow-sm">
                        Continuer <ChevronRight size={18} className="ml-1"/>
                      </Button>
                    </div>)}

                  {/* Échelle linéaire */}
                  {currentCritere.type_reponse === 'ECHELLE' && (() => {
                const [minStr, maxStr] = (currentCritere.options_reponse || '1,5').split(',');
                const min = Number(minStr) || 1;
                const max = Number(maxStr) || 5;
                const valeurs = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                const colsClass = valeurs.length <= 5 ? 'grid-cols-5' : valeurs.length <= 8 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-5 sm:grid-cols-10';
                return (<div className={`grid ${colsClass} gap-2 pt-2 w-full min-w-0`}>
                        {valeurs.map((v) => (<button key={v} type="button" onClick={() => handleAnswer(v)} className={`w-full h-12 rounded-2xl border border-border/80 bg-background hover:bg-primary/15 hover:border-primary/50 text-base font-bold text-foreground transition-colors flex items-center justify-center font-satoshi ${BTN_BASE}`}>
                            {v}
                          </button>))}
                      </div>);
            })()}

                  {/* Choix multiples */}
                  {currentCritere.type_reponse === 'CASES' && (<div className="space-y-4 pt-2">
                      <div className="flex flex-col gap-2">
                        {currentCritere.options_reponse?.split(',').map((option, index) => {
                    const label = option.trim();
                    const checked = casesSelectionnees.includes(label);
                    return (<button key={index} type="button" onClick={() => setCasesSelectionnees((prev) => checked ? prev.filter((v) => v !== label) : [...prev, label])} className={`w-full text-left p-4 border rounded-2xl text-sm font-bold transition-colors flex items-center gap-3 min-h-[52px] ${BTN_BASE} ${checked
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border/80 hover:bg-muted text-foreground'}`}>
                              <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                                {checked && '✓'}
                              </span>
                              <span>{label}</span>
                            </button>);
                })}
                      </div>
                      <Button onClick={() => handleAnswer(3, casesSelectionnees.join(' • '))} disabled={casesSelectionnees.length === 0} className="w-full py-6 rounded-2xl text-base font-bold shadow-sm">
                        Continuer <ChevronRight size={18} className="ml-1"/>
                      </Button>
                    </div>)}

                  {currentCritere.obligatoire === false && (<Button type="button" variant="link" onClick={handleSkip} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                      Passer cette question
                    </Button>)}
                </Card>
              </motion.div>)}

            {step === 'COMMENT_STEP' && (<motion.div key="comment_step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION} className="w-full">
                <Card variant="feature" className="w-full p-6 sm:p-8 space-y-4 shadow-premium-lg rounded-3xl bg-card">
                  <div className="text-center space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground font-satoshi">
                      Un message à ajouter ?
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">
                      Votre avis nous permet d'améliorer notre qualité de service
                    </p>
                  </div>

                  {erreur && (<div role="alert" className="rounded-2xl bg-destructive/10 border border-destructive/25 p-3 text-xs font-bold text-destructive">
                      {erreur}
                    </div>)}

                  <div className="space-y-4 pt-1">
                    <div className="text-left space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare size={13}/> Message ou suggestion
                      </label>
                      <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Des détails à partager ? Un problème rencontré ?" rows={3} maxLength={1000} className="text-base rounded-2xl border-border/80"/>
                    </div>

                    <div className="text-left space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Phone size={13}/> Téléphone (facultatif)
                      </label>
                      <Input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Ex: +225 0700000000" className="h-12 rounded-2xl px-4 text-base border-border/80"/>
                      <p className="text-[10px] text-muted-foreground leading-tight font-medium">
                        Votre numéro sera haché (SHA-256) pour éviter les doublons et ne sera jamais partagé.
                      </p>
                    </div>

                    <Button onClick={finalSubmit} disabled={envoiEnCours} className="w-full py-6 rounded-2xl text-base font-bold shadow-sm flex items-center justify-center gap-2 btn-glow-gold">
                      {envoiEnCours ? (<>
                          <Loader2 size={18} className="animate-spin"/>
                          Envoi en cours...
                        </>) : ('Envoyer mon avis')}
                    </Button>
                  </div>
                </Card>
              </motion.div>)}

            {step === 'SUCCESS' && (<motion.div key="success_step" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={TRANSITION} className="w-full">
                <Card variant="feature" className="w-full p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card">
                  <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto text-4xl shadow-sm border border-success/30">
                    🎉
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-satoshi">
                      {brandConfig?.form_thank_you || "Merci pour votre avis !"}
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-[280px] mx-auto font-medium">
                      Votre retour précieux nous aide à améliorer constamment votre expérience au guichet.
                    </p>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground font-medium">Vous pouvez fermer cet onglet en toute sécurité.</p>
                  </div>
                </Card>
              </motion.div>)}
          </AnimatePresence>
        </div>

        {/* Footer Branding */}
        {!brandConfig?.hide_yeba_branding && (<div className="py-2 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Propulsé par {brandConfig?.platform_name || "Yeba"}
            </p>
          </div>)}
      </div>
    </AmbientBackground>);
};
