import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, getFormDefinitionForGuichet, soumettreAvis } from 'wasp/client/operations';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import confetti from 'canvas-confetti';
import { ChevronRight, MessageSquare, Phone, ArrowLeft, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { AmbientBackground } from '../components/AmbientBackground';
import { Card, Eyebrow } from '../components/ds';

type ServiceType = {
  id: number;
  libelle_service: string;
  criteres: any[];
};

export const CollectePage = () => {
  const { guichetId } = useParams<{ guichetId: string }>();
  const idGuichetNum = Number(guichetId);
  // Un identifiant non numérique (vieux QR, URL tronquée…) ne doit jamais
  // partir vers le serveur : la requête échouerait et retenterait en boucle,
  // laissant le spinner tourner indéfiniment.
  const idGuichetValide = Number.isSafeInteger(idGuichetNum) && idGuichetNum > 0;

  const { data: formDef, isLoading, isError } = useQuery(
    getFormDefinitionForGuichet,
    { id_guichet: idGuichetValide ? idGuichetNum : 0 },
    { enabled: idGuichetValide }
  );
  const { brandConfig } = useBrand();

  const [step, setStep] = useState<'SERVICE_SELECT' | 'QUESTIONS' | 'COMMENT_STEP' | 'SUCCESS'>('SERVICE_SELECT');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ critereId: number; score: number; texte?: string }>>([]);
  
  const [commentaire, setCommentaire] = useState('');
  const [texteReponseCourante, setTexteReponseCourante] = useState('');
  const [casesSelectionnees, setCasesSelectionnees] = useState<string[]>([]);
  const [telephone, setTelephone] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const soumissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setTexteReponseCourante('');
    setCasesSelectionnees([]);
  }, [currentQuestionIndex, step]);

  const services = formDef?.services ?? [];

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

  if (isLoading) {
    return (
      <AmbientBackground>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground mt-4">Chargement du questionnaire...</p>
        </div>
      </AmbientBackground>
    );
  }

  if (!Number.isSafeInteger(idGuichetNum) || idGuichetNum <= 0 || isError || !formDef) {
    return (
      <AmbientBackground>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-sm p-8 text-center border-destructive/30">
            <p className="text-sm font-bold text-destructive">Le guichet demandé n'existe pas ou a été désactivé.</p>
          </Card>
        </div>
      </AmbientBackground>
    );
  }

  const criteres = selectedService?.criteres?.length
    ? selectedService.criteres
    : formDef.agencyCriteres?.length
    ? formDef.agencyCriteres
    : [];

  const currentCritere = criteres[currentQuestionIndex];
  const questionnaireDisponible = criteres.length > 0;

  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    setStep('QUESTIONS');
    setCurrentQuestionIndex(0);
    setAnswers([]);
  };

  const handleAnswer = (score: number, texte?: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = {
      critereId: currentCritere.id,
      score: score,
      ...(texte !== undefined ? { texte } : {}),
    };
    setAnswers(newAnswers);

    if (currentQuestionIndex < criteres.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStep('COMMENT_STEP');
    }
  };

  const handleSkip = () => {
    if (currentQuestionIndex < criteres.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStep('COMMENT_STEP');
    }
  };

  const canGoBack =
    step === 'COMMENT_STEP' ||
    (step === 'QUESTIONS' && (currentQuestionIndex > 0 || services.length > 1)) ||
    (step === 'SERVICE_SELECT' && selectedService !== null && services.length > 1);

  const handleBack = () => {
    if (step === 'COMMENT_STEP') {
      setStep('QUESTIONS');
      setCurrentQuestionIndex(criteres.length - 1);
    } else if (step === 'QUESTIONS') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } else if (services.length > 1) {
        setStep('SERVICE_SELECT');
        setSelectedService(null);
      }
    }
  };

  const finalSubmit = async () => {
    if (envoiEnCours) return;
    if (!soumissionIdRef.current) soumissionIdRef.current = crypto.randomUUID();
    setEnvoiEnCours(true);
    setErreur(null);

    try {
      const reponsesRenseignees = answers.filter((a) => a && a.critereId !== undefined);

      await soumettreAvis({
        guichetId: idGuichetNum,
        canalId: 1, // QR_WEB
        commentaire: commentaire.trim(),
        telephone: telephone.trim() ? normaliserTelephone(telephone) : undefined,
        serviceId: selectedService?.id || undefined,
        responses: reponsesRenseignees,
        id_soumission: soumissionIdRef.current,
      });

      const idsCriteresNeutres = new Set(
        criteres.filter((c: any) => c.type_reponse === 'TEXTE' || c.type_reponse === 'CASES').map((c: any) => c.id)
      );
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
    } catch (err: any) {
      if ((import.meta as any).env?.DEV) {
        console.error("Erreur lors de la soumission de l'avis:", err);
      }
      const message = String(err?.message ?? '');
      setErreur(
        message.includes('status code 500') || message.includes('Request failed')
          ? "Nous ne pouvons pas enregistrer votre avis pour le moment. Veuillez réessayer dans quelques instants."
          : message || "Une erreur est survenue lors de la soumission de votre avis. Veuillez réessayer."
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const smileys = [
    { note: 1, icon: '😡', label: 'Très mécontent' },
    { note: 2, icon: '😟', label: 'Mécontent' },
    { note: 3, icon: '😐', label: 'Neutre' },
    { note: 4, icon: '🙂', label: 'Satisfait' },
    { note: 5, icon: '🤩', label: 'Très satisfait' },
  ];

  const normaliserTelephone = (valeur: string): string => {
    const chiffres = valeur.replace(/[^\d]/g, '');
    if (!chiffres) return '';
    if (chiffres.startsWith('225') && chiffres.length === 13) return `+${chiffres}`;
    if (chiffres.startsWith('00225')) return `+225${chiffres.slice(5)}`;
    return `+225${chiffres}`;
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
            {brandConfig?.logo_url ? (
              <img 
                src={brandConfig.logo_url} 
                alt={brandConfig.platform_name} 
                className="h-9 max-w-[140px] object-contain"
              />
            ) : (
              <span className="text-xs font-bold uppercase tracking-widest text-primary font-satoshi">
                {brandConfig?.platform_name || "Yéba"}
              </span>
            )}
          </div>
        </header>

        {/* Main Content Card */}
        <div className="w-full flex-1 flex items-center justify-center my-auto py-2">
          <AnimatePresence mode="wait">
            {step === 'SERVICE_SELECT' && services.length > 1 && (
              <motion.div
                key="service_select"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <Card variant="feature" className="w-full p-6 sm:p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card ">
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
                    <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                    Avis anonyme · données protégées
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    {services.map((service: ServiceType) => (
                      <motion.button
                        key={service.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleServiceSelect(service)}
                        className="w-full p-4 text-left rounded-2xl border border-border/80 bg-background/90 hover:bg-muted hover:border-primary/50 shadow-sm transition-all flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 min-h-[52px]"
                      >
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {service.libelle_service}
                        </span>
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </motion.button>
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
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <Card className="w-full p-6 sm:p-8 text-center space-y-3 rounded-3xl">
                  <h1 className="text-xl font-bold text-foreground font-satoshi">Questionnaire momentanément indisponible</h1>
                  <p className="text-sm text-muted-foreground">
                    Aucun critère n’est encore configuré pour ce guichet. Merci de contacter l’agence.
                  </p>
                </Card>
              </motion.div>
            )}

            {step === 'QUESTIONS' && questionnaireDisponible && currentCritere && (
              <motion.div
                key={`question_${currentQuestionIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <Card variant="feature" className="w-full p-6 sm:p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card ">
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
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight font-satoshi">
                      {currentCritere.libelle_critere}
                    </h2>
                    {currentCritere.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                        {currentCritere.description}
                      </p>
                    )}
                  </div>

                  {/* Smiley Input */}
                  {currentCritere.type_reponse === 'SMILEY' && (
                    <div className="flex justify-between items-center gap-1 sm:gap-2 pt-3 w-full min-w-0">
                      {smileys.map((s) => (
                        <motion.button
                          key={s.note}
                          whileHover={{ scale: 1.25 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleAnswer(s.note)}
                          aria-label={s.label}
                          className="text-3xl sm:text-4xl p-2 sm:p-3 flex-1 max-w-[72px] min-h-[52px] min-w-[44px] flex justify-center items-center rounded-2xl hover:bg-muted/80 border border-transparent hover:border-border/60 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        >
                          {s.icon}
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Oui/Non Input */}
                  {currentCritere.type_reponse === 'OUI_NON' && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleAnswer(5)}
                        className="bg-success/10 hover:bg-success/20 text-success border border-success/30 font-bold py-5 rounded-2xl text-base sm:text-lg transition-all flex flex-col items-center justify-center gap-1 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 min-h-[88px]"
                      >
                        <span className="text-3xl">👍</span>
                        <span>Oui</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleAnswer(1)}
                        className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 font-bold py-5 rounded-2xl text-base sm:text-lg transition-all flex flex-col items-center justify-center gap-1 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 min-h-[88px]"
                      >
                        <span className="text-3xl">👎</span>
                        <span>Non</span>
                      </motion.button>
                    </div>
                  )}

                  {/* QCM Input */}
                  {currentCritere.type_reponse === 'QCM' && (
                    <div className="flex flex-col gap-2.5 pt-2">
                      {currentCritere.options_reponse?.split(',').map((option: string, index: number) => (
                        <motion.button
                          key={index}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleAnswer(index + 1)}
                          className="w-full text-left p-4 border border-border/80 rounded-2xl hover:bg-muted text-foreground text-sm font-bold transition-all flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 min-h-[52px]"
                        >
                          <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0" />
                          <span>{option.trim()}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Text Input */}
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
                        onClick={() => handleAnswer(3, texteReponseCourante.trim())}
                        disabled={texteReponseCourante.trim().length === 0}
                        className="w-full py-6 rounded-2xl text-base font-bold shadow-sm"
                      >
                        Continuer <ChevronRight size={18} className="ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Échelle linéaire */}
                  {currentCritere.type_reponse === 'ECHELLE' && (() => {
                    const [minStr, maxStr] = (currentCritere.options_reponse || '1,5').split(',');
                    const min = Number(minStr) || 1;
                    const max = Number(maxStr) || 5;
                    const valeurs = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                    const colsClass = valeurs.length <= 5 ? 'grid-cols-5' : valeurs.length <= 8 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-5 sm:grid-cols-10';
                    return (
                      <div className={`grid ${colsClass} gap-2 pt-2 w-full min-w-0`}>
                        {valeurs.map((v) => (
                          <motion.button
                            key={v}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleAnswer(v)}
                            className="w-full h-12 rounded-2xl border border-border/80 bg-background/90 hover:bg-primary/15 hover:border-primary/50 text-base font-bold text-foreground transition-all flex items-center justify-center font-satoshi"
                          >
                            {v}
                          </motion.button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Choix multiples */}
                  {currentCritere.type_reponse === 'CASES' && (
                    <div className="space-y-4 pt-2">
                      <div className="flex flex-col gap-2">
                        {currentCritere.options_reponse?.split(',').map((option: string, index: number) => {
                          const label = option.trim();
                          const checked = casesSelectionnees.includes(label);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() =>
                                setCasesSelectionnees((prev) =>
                                  checked ? prev.filter((v) => v !== label) : [...prev, label]
                                )
                              }
                              className={`w-full text-left p-4 border rounded-2xl text-sm font-bold transition-all flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 min-h-[52px] ${
                                checked
                                  ? 'border-primary bg-primary/15 text-primary'
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
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        onClick={() => handleAnswer(3, casesSelectionnees.join(' • '))}
                        disabled={casesSelectionnees.length === 0}
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

                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Lock className="size-3 shrink-0" aria-hidden />
                    Votre retour est confidentiel et anonyme
                  </p>
                </Card>
              </motion.div>
            )}

            {step === 'COMMENT_STEP' && (
              <motion.div
                key="comment_step"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <Card variant="feature" className="w-full p-6 sm:p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card ">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight font-satoshi">
                      Finaliser votre avis
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                      Optionnel : aidez-nous à mieux comprendre votre expérience
                    </p>
                  </div>

                  {erreur && (
                    <div role="alert" className="rounded-2xl bg-destructive/10 border border-destructive/25 p-3 text-xs font-bold text-destructive">
                      {erreur}
                    </div>
                  )}

                  <div className="space-y-4 pt-1">
                    <div className="text-left space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare size={13} /> Message ou suggestion
                      </label>
                      <Textarea
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                        placeholder="Des détails à partager ? Un problème rencontré ?"
                        rows={3}
                        maxLength={1000}
                        className="text-base rounded-2xl border-border/80"
                      />
                    </div>

                    <div className="text-left space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Phone size={13} /> Téléphone (facultatif)
                      </label>
                      <Input
                        type="tel"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        placeholder="Ex: +225 0700000000"
                        className="h-12 rounded-2xl px-4 text-base border-border/80"
                      />
                      <p className="text-[10px] text-muted-foreground leading-tight font-medium">
                        Votre numéro sera haché (SHA-256) pour éviter les doublons et ne sera jamais partagé.
                      </p>
                    </div>

                    <Button 
                      onClick={finalSubmit} 
                      disabled={envoiEnCours} 
                      className="w-full py-6 rounded-2xl text-base font-bold shadow-sm flex items-center justify-center gap-2 btn-glow-gold"
                    >
                      {envoiEnCours ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        'Envoyer mon avis'
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 'SUCCESS' && (
              <motion.div
                key="success_step"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <Card variant="feature" className="w-full p-8 text-center space-y-6 shadow-premium-lg rounded-3xl bg-card ">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Branding */}
        {!brandConfig?.hide_yeba_branding && (
          <div className="py-2 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Propulsé par {brandConfig?.platform_name || "Yeba"}
            </p>
          </div>
        )}
      </div>
    </AmbientBackground>
  );
};
