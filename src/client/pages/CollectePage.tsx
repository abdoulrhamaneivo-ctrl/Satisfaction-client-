import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, getFormDefinitionForGuichet, soumettreAvis } from 'wasp/client/operations';
import { MotionCard } from '../components/MotionCard';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import confetti from 'canvas-confetti';
import { ChevronRight, MessageSquare, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { AmbientBackground } from '../components/AmbientBackground';

type ServiceType = {
  id: number;
  libelle_service: string;
  criteres: any[];
};

export const CollectePage = () => {
  const { guichetId } = useParams<{ guichetId: string }>();
  const idGuichetNum = Number(guichetId);

  const { data: formDef, isLoading, isError } = useQuery(getFormDefinitionForGuichet, { id_guichet: idGuichetNum });
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
  // Conservé pendant une tentative : un double clic ou une relance réseau
  // représente la même soumission côté serveur, jamais deux avis.
  const soumissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setTexteReponseCourante('');
    setCasesSelectionnees([]);
  }, [currentQuestionIndex, step]);

  // Initialize step based on number of services
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
          <p className="text-sm font-semibold text-muted-foreground mt-4">Chargement du questionnaire...</p>
        </div>
      </AmbientBackground>
    );
  }

  if (!Number.isSafeInteger(idGuichetNum) || idGuichetNum <= 0 || isError || !formDef) {
    return (
      <AmbientBackground>
        <div className="flex min-h-screen items-center justify-center p-4">
          <MotionCard className="w-full max-w-sm p-8 text-center">
            <p className="text-sm font-bold text-destructive">Le guichet demandé n'existe pas ou a été désactivé.</p>
          </MotionCard>
        </div>
      </AmbientBackground>
    );
  }

  // Determine criteres list
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

  // Question facultative (obligatoire === false) : on avance sans enregistrer
  // de réponse pour ce critère, plutôt que de forcer une valeur arbitraire.
  const handleSkip = () => {
    if (currentQuestionIndex < criteres.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStep('COMMENT_STEP');
    }
  };

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
      // Filtre les "trous" laissés par les questions facultatives passées
      // (handleSkip n'écrit rien dans answers[] à cet index) : sans ça, le
      // tableau envoyé au serveur contient des `null` après sérialisation
      // JSON, que soumettreAvis ne sait pas interpréter.
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

      // Calculate worst score to trigger confetti — on exclut les réponses
      // de type TEXTE et CASES (score neutre fixe, ce n'est pas une vraie
      // note) pour ne pas bloquer les confettis sur un formulaire par
      // ailleurs excellent.
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
      // En production, ne jamais exposer l'URL ou le détail HTTP du serveur
      // au client. Les détails restent disponibles côté Railway grâce au log
      // [SOUMETTRE_AVIS] ajouté dans l'action serveur.
      if (import.meta.env.DEV) {
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

  // Sans cette normalisation, "07 00 00 00 00" et "+225 0700000000" génèrent
  // deux hachages SHA-256 différents côté serveur pour la même personne —
  // la protection anti-rejeu (1 avis/24h) devient contournable simplement
  // en variant le format de saisie. On ramène tout au format E.164 local
  // (+225XXXXXXXXXX) avant envoi.
  const normaliserTelephone = (valeur: string): string => {
    const chiffres = valeur.replace(/[^\d]/g, '');
    if (!chiffres) return '';
    if (chiffres.startsWith('225') && chiffres.length === 13) return `+${chiffres}`;
    if (chiffres.startsWith('00225')) return `+225${chiffres.slice(5)}`;
    // Numéro local à 10 chiffres (ex. "0700000000") : le "0" initial fait
    // partie du numéro en Côte d'Ivoire depuis 2021, on ne le retire pas.
    return `+225${chiffres}`;
  };

  return (
    <AmbientBackground>
      <div className="flex min-h-screen flex-col justify-between p-4">
      {/* Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-4">
        {step !== 'SUCCESS' && (step !== 'SERVICE_SELECT' || (formDef.services && formDef.services.length > 1 && selectedService !== null)) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> Retour
          </Button>
        )}
        <div className="text-right ml-auto">
          {brandConfig?.logo_url ? (
            <img 
              src={brandConfig.logo_url} 
              alt={brandConfig.platform_name} 
              className="h-8 max-w-[120px] object-contain"
            />
          ) : (
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {brandConfig?.platform_name || "Yeba"}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="w-full flex-1 flex items-center justify-center max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {step === 'SERVICE_SELECT' && services.length > 1 && (
            <motion.div
              key="service_select"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              <MotionCard className="w-full p-6 text-center space-y-6 shadow-premium-lg border-border/80">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                    {brandConfig?.form_title || "Bienvenue au guichet"}
                  </h1>
                  <p className="text-base font-bold text-primary mt-1">
                    {formDef.guichetName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {brandConfig?.form_subtitle || "Quelle opération venez-vous d'effectuer ?"}
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  {services.map((service: ServiceType) => (
                    <motion.button
                      key={service.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleServiceSelect(service)}
                      className="w-full p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted hover:border-primary/40 shadow-premium-sm transition-all flex items-center justify-between group"
                    >
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {service.libelle_service}
                      </span>
                      <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </motion.button>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Votre avis nous permet d'améliorer notre qualité de service
                </p>
              </MotionCard>
            </motion.div>
          )}

          {step === 'QUESTIONS' && !questionnaireDisponible && (
            <motion.div
              key="questionnaire-indisponible"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <MotionCard className="w-full p-8 text-center space-y-3 shadow-premium-lg border-border/80">
                <h1 className="text-xl font-extrabold text-foreground">Questionnaire momentanément indisponible</h1>
                <p className="text-sm text-muted-foreground">
                  Aucun critère n’est encore configuré pour ce guichet. Merci de contacter l’agence.
                </p>
              </MotionCard>
            </motion.div>
          )}

          {step === 'QUESTIONS' && questionnaireDisponible && currentCritere && (
            <motion.div
              key={`question_${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <MotionCard className="w-full p-6 text-center space-y-6 shadow-premium-lg border-border/80">
                {/* Progress bar */}
                <div
                  className="w-full bg-muted h-1.5 rounded-full overflow-hidden"
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
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                  <span>{selectedService?.libelle_service || "Évaluation"}</span>
                  <span>Question {currentQuestionIndex + 1} sur {criteres.length}</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold text-foreground leading-tight">
                    {currentCritere.libelle_critere}
                  </h2>
                  {currentCritere.description && (
                    <p className="text-sm text-muted-foreground">
                      {currentCritere.description}
                    </p>
                  )}
                </div>

                {/* Smiley Input */}
                {currentCritere.type_reponse === 'SMILEY' && (
                  <div className="flex justify-around gap-1 pt-4">
                    {smileys.map((s) => (
                      <motion.button
                        key={s.note}
                        whileHover={{ scale: 1.25 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleAnswer(s.note)}
                        aria-label={s.label}
                        className="text-4xl p-2.5 rounded-full hover:bg-muted transition-colors"
                      >
                        {s.icon}
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Oui/Non Input */}
                {currentCritere.type_reponse === 'OUI_NON' && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(5)}
                      className="bg-success/10 hover:bg-success/15 text-success border border-success/30 font-bold py-4 rounded-2xl text-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-sm"
                    >
                      <span className="text-2xl">👍</span>
                      <span>Oui</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(1)}
                      className="bg-destructive/10 hover:bg-destructive/15 text-destructive border border-destructive/30 font-bold py-4 rounded-2xl text-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-sm"
                    >
                      <span className="text-2xl">👎</span>
                      <span>Non</span>
                    </motion.button>
                  </div>
                )}

                {/* QCM Input */}
                {currentCritere.type_reponse === 'QCM' && (
                  <div className="flex flex-col gap-2 pt-2">
                    {currentCritere.options_reponse?.split(',').map((option: string, index: number) => (
                      <motion.button
                        key={index}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleAnswer(index + 1)}
                        className="w-full text-left p-3.5 border border-border rounded-xl hover:bg-muted text-foreground text-sm font-semibold transition-colors flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {option.trim()}
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
                      className="text-center"
                      onChange={(e) => setTexteReponseCourante(e.target.value)}
                    />
                    <Button
                      onClick={() => handleAnswer(3, texteReponseCourante.trim())}
                      disabled={texteReponseCourante.trim().length === 0}
                      className="w-full py-6 rounded-2xl text-base font-bold shadow-premium-md"
                    >
                      Continuer <ChevronRight size={18} className="ml-1" />
                    </Button>
                  </div>
                )}

                {/* Échelle linéaire (ex. note sur 10) */}
                {currentCritere.type_reponse === 'ECHELLE' && (() => {
                  const [minStr, maxStr] = (currentCritere.options_reponse || '1,5').split(',');
                  const min = Number(minStr) || 1;
                  const max = Number(maxStr) || 5;
                  const valeurs = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                  return (
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {valeurs.map((v) => (
                        <motion.button
                          key={v}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleAnswer(v)}
                          className="min-w-11 h-11 px-2 rounded-xl border border-border bg-background hover:bg-primary/10 hover:border-primary/40 text-sm font-bold text-foreground transition-colors"
                        >
                          {v}
                        </motion.button>
                      ))}
                    </div>
                  );
                })()}

                {/* Choix multiples (cases à cocher) */}
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
                            className={`w-full text-left p-3.5 border rounded-xl text-sm font-semibold transition-colors flex items-center gap-2.5 ${
                              checked
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:bg-muted text-foreground'
                            }`}
                          >
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                              }`}
                            >
                              {checked && '✓'}
                            </span>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      onClick={() => handleAnswer(3, casesSelectionnees.join(' • '))}
                      disabled={casesSelectionnees.length === 0}
                      className="w-full py-6 rounded-2xl text-base font-bold shadow-premium-md"
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
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Passer cette question
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  Votre retour est confidentiel et anonyme
                </p>
              </MotionCard>
            </motion.div>
          )}

          {step === 'COMMENT_STEP' && (
            <motion.div
              key="comment_step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              <MotionCard className="w-full p-6 text-center space-y-6 shadow-premium-lg border-border/80">
                <div>
                  <h2 className="text-xl font-extrabold text-foreground leading-tight">
                    Finaliser votre avis
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Optionnel : aidez-nous à mieux comprendre votre expérience
                  </p>
                </div>

                {erreur && (
                  <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive">
                    {erreur}
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div className="text-left space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare size={12} /> Message ou suggestion
                    </label>
                    <Textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      placeholder="Des détails à partager ? Un problème rencontré ?"
                      rows={3}
                    />
                  </div>

                  <div className="text-left space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Phone size={12} /> Téléphone (facultatif)
                    </label>
                    <Input
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="Ex: +225 0700000000"
                      className="h-12 rounded-2xl px-4"
                    />
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Votre numéro sera haché (SHA-256) pour éviter les doublons et ne sera jamais partagé.
                    </p>
                  </div>

                  <Button 
                    onClick={finalSubmit} 
                    disabled={envoiEnCours} 
                    className="w-full py-6 rounded-2xl text-base font-bold shadow-premium-md flex items-center justify-center gap-2"
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
              </MotionCard>
            </motion.div>
          )}

          {step === 'SUCCESS' && (
            <motion.div
              key="success_step"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full"
            >
              <MotionCard className="w-full p-8 text-center space-y-6 shadow-premium-lg border-border/80">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto text-4xl shadow-sm border border-success/20">
                  🎉
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-foreground">
                    {brandConfig?.form_thank_you || "Merci pour votre avis !"}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                    Votre retour précieux nous aide à améliorer constamment votre expérience au guichet.
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">Vous pouvez fermer cet onglet en toute sécurité.</p>
                </div>
              </MotionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      {!brandConfig?.hide_yeba_branding && (
        <div className="py-4 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Propulsé par {brandConfig?.platform_name || "Yeba"}
          </p>
        </div>
      )}
      </div>
    </AmbientBackground>
  );
};
