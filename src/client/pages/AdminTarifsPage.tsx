import React, { useEffect, useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { useQuery, getPlanPricing, updatePlanPricing } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import { MotionCard } from '../components/MotionCard';
import { Button } from '../components/ui/button';

const PLAN_LABELS: Record<string, { name: string; description: string }> = {
  hobby: { name: 'Essentiel', description: '1 agence, guichets illimités, support standard' },
  pro: { name: 'Pro', description: 'Multi-agences, alertes temps réel, support prioritaire' },
  credits10: { name: 'Recharge SMS/Alertes', description: 'Pack additionnel non reconductible' },
};

export const AdminTarifsPage = () => {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const { data: pricing, isLoading: isPricingLoading, refetch } = useQuery(getPlanPricing);

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [savedPlan, setSavedPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pricing) {
      setAmounts({
        hobby: String(pricing.hobby ?? ''),
        pro: String(pricing.pro ?? ''),
        credits10: String(pricing.credits10 ?? ''),
      });
    }
  }, [pricing]);

  if (isUserLoading || isPricingLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-10 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border/70 bg-card-subtle/50" />
        ))}
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <MotionCard className="max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-bold text-foreground">Accès réservé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cette page est réservée aux administrateurs de la plateforme CXSAT.
          </p>
        </MotionCard>
      </div>
    );
  }

  const handleSave = async (planId: string) => {
    setError(null);
    const amountFcfa = Number(amounts[planId]);

    if (!Number.isInteger(amountFcfa) || amountFcfa < 0) {
      setError('Merci de saisir un montant entier positif en FCFA.');
      return;
    }

    setSavingPlan(planId);
    try {
      await updatePlanPricing({ planId: planId as 'hobby' | 'pro' | 'credits10', amountFcfa });
      await refetch();
      setSavedPlan(planId);
      setTimeout(() => setSavedPlan(null), 2500);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSavingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <MotionCard className="mx-auto max-w-2xl p-8">
        <h1 className="text-3xl font-bold text-foreground">Tarification (Admin CXSAT)</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ces montants, en Francs CFA, s'affichent immédiatement sur la page publique "Tarifs".
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-6">
          {(['hobby', 'pro', 'credits10'] as const).map((planId) => (
            <div key={planId} className="rounded-2xl bg-muted/30 p-6">
              <h2 className="text-lg font-semibold text-foreground">{PLAN_LABELS[planId].name}</h2>
              <p className="text-xs text-muted-foreground">{PLAN_LABELS[planId].description}</p>

              <div className="mt-4 flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={amounts[planId] ?? ''}
                  onChange={(e) => setAmounts((prev) => ({ ...prev, [planId]: e.target.value }))}
                  className="w-40 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
                <span className="text-sm text-muted-foreground">FCFA</span>

                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    disabled={savingPlan === planId}
                    onClick={() => handleSave(planId)}
                  >
                    {savingPlan === planId ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </motion.div>

                {savedPlan === planId && (
                  <span className="text-sm font-semibold text-success">Enregistré ✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </MotionCard>
    </div>
  );
};
