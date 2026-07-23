import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Radio, ArrowLeft, Star } from "lucide-react";
import { AmbientBackground } from "../client/components/AmbientBackground";

const HIGHLIGHTS = [
  { icon: Radio, text: "Collecte des avis par QR Code & USSD" },
  { icon: Zap, text: "Tableau de bord temps réel" },
  { icon: ShieldCheck, text: "Alertes instantanées SMS / WhatsApp" },
];

interface AuthPageLayoutProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Signature du panneau de marque : la note de satisfaction (5 étoiles)
 * s'allume progressivement puis se réinitialise, en boucle douce — un
 * clin d'œil direct au produit (Yeba mesure la satisfaction client) plutôt
 * qu'une icône générique. Élément volontairement unique à cette page pour
 * lui donner une identité propre, sans rien changer à la marque.
 */
function NoteSignature() {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.25, scale: 0.85 }}
          animate={{ opacity: [0.25, 1, 1, 0.25], scale: [0.85, 1.08, 1, 0.85] }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            repeatDelay: 1.2,
            delay: i * 0.22,
            ease: "easeInOut",
          }}
        >
          <Star className="size-3 fill-current text-secondary-muted" />
        </motion.span>
      ))}
    </div>
  );
}

/**
 * Habillage commun des pages d'authentification (connexion, mot de passe
 * oublié, réinitialisation, vérification e-mail) — panneau de marque +
 * panneau de formulaire — pour une expérience cohérente sur toute la
 * plateforme Yeba.
 */
export function AuthPageLayout({ eyebrow, title, subtitle, children, footer }: AuthPageLayoutProps) {
  return (
    <AmbientBackground className="flex items-center justify-center px-4 py-10 sm:py-12">
      {/* En-tête compact visible uniquement sur mobile : le panneau de marque
          plein écran n'apparaît qu'à partir de `lg`, un mobile ne doit donc
          jamais se retrouver avec un simple formulaire sans aucune identité
          de marque au-dessus. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/5 lg:hidden"
      >
        <img src="/yeba-logo.svg" alt="Yeba Abidjan" className="h-9 w-auto" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-premium-lg ring-1 ring-black/[0.02] lg:grid-cols-[1.05fr_1fr]"
      >
        {/* Panneau de marque */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex">
          {/* Texture fine en pointillés : profondeur discrète, jamais au
              premier plan (opacité très faible), qui évite au grand aplat
              de couleur primaire de paraître plat/générique. */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-16 top-10 h-56 w-56 rounded-full bg-secondary/15 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -left-10 bottom-16 h-48 w-48 rounded-full bg-white/5 blur-3xl"
          />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] backdrop-blur-sm">
              <NoteSignature />
              {eyebrow}
            </span>
            <div className="mt-6 inline-flex w-fit items-center rounded-2xl bg-white px-4 py-3 shadow-lg">
              <img src="/yeba-logo.svg" alt="Yeba Abidjan" className="h-10 w-auto" />
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">{subtitle}</p>
          </div>

          <ul className="relative mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
                className="flex items-center gap-3 text-sm"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary-muted">
                  <Icon className="size-3.5" />
                </span>
                {text}
              </motion.li>
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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="mb-8"
          >
            <h1 className="text-title-md font-black tracking-tight text-foreground">{title}</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35 }}
          >
            {children}
          </motion.div>

          {footer && <div className="mt-6 text-sm font-medium text-foreground">{footer}</div>}
        </div>
      </motion.div>
    </AmbientBackground>
  );
}
