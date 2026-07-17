import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, ArrowLeft } from "lucide-react";
import { AmbientBackground } from "../client/components/AmbientBackground";
import { CXSATLogo } from "../client/components/CXSATLogo";

const HIGHLIGHTS = [
  "Collecte des avis par QR Code & USSD",
  "Tableau de bord temps réel",
  "Alertes instantanées SMS / WhatsApp",
];

interface AuthPageLayoutProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Habillage commun des pages d'authentification (connexion, mot de passe
 * oublié, réinitialisation, vérification e-mail) — panneau de marque +
 * panneau de formulaire — pour une expérience cohérente sur toute la
 * plateforme CXSAT.
 */
export function AuthPageLayout({ eyebrow, title, subtitle, children, footer }: AuthPageLayoutProps) {
  return (
    <AmbientBackground className="flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-premium-lg lg:grid-cols-[1.05fr_1fr]"
      >
        {/* Panneau de marque */}
        <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
          <div
            aria-hidden
            className="animate-float-slower absolute -right-16 top-10 h-56 w-56 rounded-full bg-secondary/25 blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
              <Sparkles className="size-3.5" /> {eyebrow}
            </span>
            <div className="mt-6 flex items-center gap-3">
              <CXSATLogo className="size-10" />
              <h2 className="text-title-xl font-black leading-tight">
                <span className="text-gradient-primary">CXSAT</span> Abidjan
              </h2>
            </div>
            <p className="mt-3 max-w-sm text-sm text-primary-foreground/70">{subtitle}</p>
          </div>

          <ul className="relative mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <span className="flex size-6 items-center justify-center rounded-full bg-secondary/20 text-secondary-muted">
                  <ShieldCheck className="size-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Panneau de formulaire */}
        <div className="p-8 sm:p-10">
          <div className="mb-6 flex justify-start">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              Retour à l'accueil
            </a>
          </div>
          <div className="mb-8">
            <h1 className="text-title-md font-black tracking-tight text-foreground">{title}</h1>
          </div>

          {children}

          {footer && <div className="mt-6 text-sm font-medium text-foreground">{footer}</div>}
        </div>
      </motion.div>
    </AmbientBackground>
  );
}
