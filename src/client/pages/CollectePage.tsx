import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, getFormDefinitionForGuichet, soumettreAvis } from 'wasp/client/operations';
import { MotionCard } from '../components/MotionCard';
import { Button } from '../components/ui/button';
import confetti from 'canvas-confetti';
import { ChevronRight, MessageSquare, Phone, ArrowLeft, Loader2 } from 'lucide-react';

type ServiceType = {
  id: number;
  libelle_service: string;
  criteres: any[];
};

export const CollectePage = () => {
  const { guichetId } = useParams<{ guichetId: string }>();
  const idGuichetNum = Number(guichetId);

  const { data: formDef, isLoading } = useQuery(getFormDefinitionForGuichet, { id_guichet: idGuichetNum });

  const [step, setStep] = useState<'SERVICE_SELECT' | 'QUESTIONS' | 'COMMENT_STEP' | 'SUCCESS'>('SERVICE_SELECT');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ critereId: number; score: number }>>([]);
  
  const [commentaire, setCommentaire] = useState('');
  const [telephone, setTelephone] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Initialize step based on number of services
  useEffect(() => {
    if (formDef) {
      if (formDef.services && formDef.services.length === 1) {
        setSelectedService(formDef.services[0]);
        setStep('QUESTIONS');
      } else if (!formDef.services || formDef.services.length === 0) {
        setStep('QUESTIONS');
      }
    }
  }, [formDef]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-neutral-500 mt-4">Chargement du questionnaire...</p>
      </div>
    );
  }

  if (!formDef) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <MotionCard className="w-full max-w-sm p-8 text-center">
          <p className="text-sm font-bold text-destructive">Le guichet demandé n'existe pas ou a été désactivé.</p>
        </MotionCard>
      </div>
    );
  }

  // Determine criteres list
  const criteres = selectedService?.criteres?.length
    ? selectedService.criteres
    : formDef.agencyCriteres?.length
    ? formDef.agencyCriteres
    : [{ id: 1, libelle_critere: "Satisfaction globale", type_reponse: "SMILEY", description: "Votre appréciation générale de notre accueil" }];

  const currentCritere = criteres[currentQuestionIndex];

  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    setStep('QUESTIONS');
    setCurrentQuestionIndex(0);
    setAnswers([]);
  };

  const handleAnswer = (score: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = {
      critereId: currentCritere.id,
      score: score
    };
    setAnswers(newAnswers);

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
      } else if (formDef.services && formDef.services.length > 1) {
        setStep('SERVICE_SELECT');
        setSelectedService(null);
      }
    }
  };

  const finalSubmit = async () => {
    if (envoiEnCours) return;
    setEnvoiEnCours(true);
    setErreur(null);

    try {
      await soumettreAvis({
        guichetId: idGuichetNum,
        canalId: 1, // QR_WEB
        commentaire: commentaire.trim(),
        telephone: telephone.trim() || undefined,
        serviceId: selectedService?.id || undefined,
        responses: answers
      });

      // Calculate worst score to trigger confetti
      const scores = answers.map(a => a.score);
      const minScore = Math.min(...scores);
      if (minScore >= 4) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Erreur lors de la soumission de l\'avis:', err);
      setErreur(err?.message || "Une erreur est survenue lors de la soumission de votre avis. Veuillez réessayer.");
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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-4">
      {/* Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-4">
        {step !== 'SUCCESS' && (step !== 'SERVICE_SELECT' || (formDef.services && formDef.services.length > 1 && selectedService !== null)) && (
          <button 
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <ArrowLeft size={16} /> Retour
          </button>
        )}
        <div className="text-right ml-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            CXSAT
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="w-full flex-1 flex items-center justify-center max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {step === 'SERVICE_SELECT' && (
            <motion.div
              key="service_select"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              <MotionCard className="w-full p-6 text-center space-y-6 shadow-premium-lg border-border/80">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    Bienvenue au guichet
                  </h1>
                  <p className="text-base font-bold text-primary mt-1">
                    {formDef.guichetName}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mt-2">
                    Quelle opération venez-vous d'effectuer ?
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  {formDef.services.map((service: ServiceType) => (
                    <motion.button
                      key={service.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleServiceSelect(service)}
                      className="w-full p-4 text-left rounded-2xl border border-neutral-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800/80 hover:border-primary/40 shadow-premium-sm transition-all flex items-center justify-between group"
                    >
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-primary transition-colors">
                        {service.libelle_service}
                      </span>
                      <ChevronRight size={18} className="text-neutral-400 group-hover:text-primary transition-colors" />
                    </motion.button>
                  ))}
                </div>

                <p className="text-xs text-neutral-400">
                  Votre avis nous permet d'améliorer notre qualité de service
                </p>
              </MotionCard>
            </motion.div>
          )}

          {step === 'QUESTIONS' && (
            <motion.div
              key={`question_${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <MotionCard className="w-full p-6 text-center space-y-6 shadow-premium-lg border-border/80">
                {/* Progress bar */}
                <div className="w-full bg-neutral-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / criteres.length) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-neutral-400">
                  <span>{selectedService?.libelle_service || "Évaluation"}</span>
                  <span>Question {currentQuestionIndex + 1} sur {criteres.length}</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white leading-tight">
                    {currentCritere.libelle_critere}
                  </h2>
                  {currentCritere.description && (
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
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
                        className="text-4xl p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
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
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-4 rounded-2xl text-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-sm"
                    >
                      <span className="text-2xl">👍</span>
                      <span>Oui</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(1)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-4 rounded-2xl text-lg transition-colors flex flex-col items-center justify-center gap-1 shadow-sm"
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
                        className="w-full text-left p-3.5 border border-neutral-200 dark:border-slate-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-slate-800/80 text-neutral-800 dark:text-neutral-200 text-sm font-semibold transition-colors flex items-center gap-2"
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
                    <textarea
                      placeholder="Votre réponse ici..."
                      rows={4}
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-neutral-800 dark:text-neutral-100 resize-none"
                      onChange={(e) => {
                        setCommentaire(e.target.value);
                      }}
                    />
                    <Button onClick={() => handleAnswer(5)} className="w-full py-6 rounded-2xl text-base font-bold shadow-premium-md">
                      Continuer <ChevronRight size={18} className="ml-1" />
                    </Button>
                  </div>
                )}

                <p className="text-xs text-neutral-400">
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
                  <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white leading-tight">
                    Finaliser votre avis
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                    Optionnel : aidez-nous à mieux comprendre votre expérience
                  </p>
                </div>

                {erreur && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-600">
                    {erreur}
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div className="text-left space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare size={12} /> Message ou suggestion
                    </label>
                    <textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      placeholder="Des détails à partager ? Un problème rencontré ?"
                      rows={3}
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-neutral-800 dark:text-neutral-100 resize-none"
                    />
                  </div>

                  <div className="text-left space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <Phone size={12} /> Téléphone (facultatif)
                    </label>
                    <input
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="Ex: +225 0700000000"
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-neutral-800 dark:text-neutral-100"
                    />
                    <p className="text-[10px] text-neutral-400 leading-tight">
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
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto text-4xl shadow-sm border border-emerald-100/50">
                  🎉
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                    Merci pour votre avis !
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 max-w-[280px] mx-auto">
                    Votre retour précieux nous aide à améliorer constamment votre expérience au guichet.
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-neutral-400">Vous pouvez fermer cet onglet en toute sécurité.</p>
                </div>
              </MotionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="py-4 text-center">
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
          Propulsé par CXSAT
        </p>
      </div>
    </div>
  );
};
