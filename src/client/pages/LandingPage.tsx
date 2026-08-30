import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from 'wasp/client/auth'
import {
  QrCode,
  MessageSquareQuote,
  BellRing,
  ArrowRight,
  LogIn,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Zap,
  Timer,
  Smartphone,
  ChevronRight,
  Menu,
  X,
  BarChart3,
} from 'lucide-react'
import { AmbientBackground } from '../components/AmbientBackground'
import { Button } from '../components/ds'
import { useBrand } from '../context/BrandContext'
import { YebaLogo } from '../components/YebaLogo'
import { BandeauInstitutionnel } from '../components/BandeauInstitutionnel'
import { motion, useReducedMotion, useInView } from 'framer-motion'

// Photos du terrain (guichets / agence) fournies dans docs/, servies depuis public/.
const HERO_IMAGES = [
  '/hero-1.jpg',
  '/hero-2.jpg',
  '/hero-3.jpg',
  '/hero-4.jpg',
  '/hero-5.jpg',
]

// Compteur animé : la valeur défile de 0 à sa cible quand elle entre à l'écran.
function Counter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduce || value === 0) { setDisplay(value); return }
    const duration = 1200
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(eased * value))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, reduce])

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

export const LandingPage = () => {
  const { data: user } = useAuth()
  const { brandConfig } = useBrand()
  const nom = brandConfig?.platform_name || 'Yéba'
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 80)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const NAV_LINKS = [
    { hash: 'produit', label: 'LE PRODUIT' },
    { hash: 'fonctionnement', label: 'COMMENT ÇA MARCHE' },
    { hash: 'equipes', label: 'PENSÉ POUR VOS ÉQUIPES' },
    { hash: 'contact', label: 'ESPACE ÉQUIPES' },
  ]

  return (
    <AmbientBackground className="min-h-screen text-foreground overflow-x-hidden flex flex-col">
      {/* ===== Header Mint ===== */}
      <header
        className={`fixed top-0 inset-x-0 z-50 bg-white transition-all duration-300 ${
          scrolled ? 'py-1.5 shadow-card' : 'py-4'
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <YebaLogo className={scrolled ? 'size-7' : 'size-9'} />
            <span className="text-lg font-bold tracking-tight font-satoshi">{nom}</span>
          </div>

          <nav aria-label="Navigation principale" className="hidden items-center md:flex">
            <ul className="flex items-center gap-2 lg:gap-4">
              {NAV_LINKS.map((l) => (
                <li key={l.hash} className="mx-2 lg:mx-4">
                  <a
                    href={`#${l.hash}`}
                    onClick={(e) => scrollTo(e, l.hash)}
                    className="px-2 py-8 text-sm font-medium uppercase tracking-wide text-foreground transition-colors hover:text-warning"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="ml-2 lg:ml-4">
                {user ? (
                  <a href="/dashboard">
                    <Button size="sm" className="rounded-xl gap-2">
                      <LayoutDashboard className="size-4" /> Tableau de bord
                    </Button>
                  </a>
                ) : (
                  <a href="/login">
                    <Button size="sm" className="rounded-xl gap-2">
                      <LogIn className="size-4" /> Espace équipe
                    </Button>
                  </a>
                )}
              </li>
            </ul>
          </nav>

          <button
            type="button"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 md:hidden"
          >
            {mobileOpen ? (
              <X size={28} aria-hidden="true" className="text-foreground" />
            ) : (
              <>
                <span className="h-0.5 w-6 bg-foreground" />
                <span className="h-0.5 w-6 bg-foreground" />
                <span className="h-0.5 w-6 bg-foreground" />
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer NOIR */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-background/80 md:hidden"
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[hsl(216_40%_12%)] p-5 transition-colors sm:w-2/3 md:hidden"
            initial={{ right: '-100%' }}
            animate={{ right: 0 }}
            exit={{ right: '-100%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setMobileOpen(false)}
              className="ml-auto flex h-11 w-11 items-center justify-center text-white"
            >
              <X size={28} aria-hidden="true" />
            </button>
            <ul className="mt-6 space-y-2">
              {NAV_LINKS.map((l) => (
                <li key={l.hash}>
                  <a
                    href={`#${l.hash}`}
                    onClick={(e) => scrollTo(e, l.hash)}
                    className="block py-3 text-2xl font-semibold text-white transition-colors hover:text-warning"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="/login" className="btn-mint mt-8 w-full rounded-xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Espace équipe
            </a>
          </motion.aside>
        </>
      )}

      {/* Bandeau institutionnel Poste CI */}
      <BandeauInstitutionnel />

      <main className="flex-1 pt-28 md:pt-36">
        {/* ===== Hero ===== */}
        <section id="produit" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
          <div className="absolute inset-0 hero-carousel" aria-hidden="true">
            {HERO_IMAGES.map((src) => (
              <img key={src} src={src} alt="" loading="eager" decoding="async" />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#052e1c]/95 via-[#0a4026]/85 to-background" aria-hidden="true" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, rgba(3,20,12,0.45) 100%)' }} aria-hidden="true" />

          <div className="relative z-10 mx-auto max-w-4xl px-6 py-32 text-center text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
              <span className="size-1.5 rounded-full bg-warning" />
              Satisfaction client au guichet
            </span>

            <h1 className="mt-7 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.08] font-satoshi drop-shadow-sm">
              Écoutez vos usagers.
              <span className="block text-warning">Réagissez en temps réel.</span>
            </h1>

            <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
              QR code et USSD au guichet, tableau de bord et alertes pour vos équipes.
              Détectez les insatisfactions avant qu'elles ne remontent.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              {user ? (
                <a href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto rounded-2xl bg-white text-primary hover:bg-white/95 px-8 gap-2 shadow-lg">
                    Accéder au tableau de bord <ArrowRight className="size-5" />
                  </Button>
                </a>
              ) : (
                <a href="/login">
                  <Button size="lg" className="w-full sm:w-auto rounded-2xl bg-white text-primary hover:bg-white/95 px-8 gap-2 shadow-lg">
                    Se connecter <ArrowRight className="size-5" />
                  </Button>
                </a>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/75 font-medium">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-warning" /> Multi-guichets illimités
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-warning" /> Scan QR & USSD sans application
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-warning" /> Données isolées par entreprise
              </span>
            </div>
          </div>
        </section>

        {/* ===== Comment ça marche ===== */}
        <motion.section
          id="fonctionnement"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-auto max-w-6xl px-6 py-20"
        >
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-satoshi">
              Comment ça marche
            </h2>
            <p className="mt-3 text-muted-foreground">Trois étapes, du guichet au pilotage.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: QrCode, step: '1', title: 'Scannez', desc: 'Un QR code au guichet, ou USSD sans internet. L\'usager répond en 10 secondes.' },
              { icon: MessageSquareQuote, step: '2', title: 'L\'avis remonte', desc: 'Chaque note et commentaire arrive en temps réel, classé par agence et guichet.' },
              { icon: BellRing, step: '3', title: 'Vous réagissez', desc: 'Alerte automatique sur les notes critiques, analyse IA des commentaires.' },
            ].map(({ icon: Icon, step, title, desc }, i) => (
              <motion.div
                key={step}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className="relative rounded-3xl border border-border/80 bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 hover-lift"
              >
                <span className="absolute top-6 right-6 text-5xl font-bold text-muted-foreground/15 font-satoshi">{step}</span>
                <div className={`flex size-12 items-center justify-center rounded-2xl border ${i % 2 === 1 ? 'bg-warning/10 border-warning/25 text-warning' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold font-satoshi">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Démonstration vidéo — crossfade hero conservé, ici on garde la vidéo existante */}
          <div className="mt-14 mx-auto max-w-4xl">
            <video
              src="/yeba-howto.mp4"
              poster="/hero-3.jpg"
              controls
              playsInline
              preload="none"
              className="w-full rounded-3xl border border-border/80 shadow-lg bg-black hover-lift"
              aria-label="Vidéo de démonstration : comment fonctionne Yéba, du scan du QR code à l'action de la direction"
            />
            <div className="lisere-tricolore mt-4" aria-hidden="true" />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Le parcours complet en 14 secondes — du guichet à la décision.
            </p>
          </div>
        </motion.section>

        {/* ===== Pensé pour vos équipes ===== */}
        <motion.section
          id="equipes"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-auto max-w-6xl px-6 py-20 border-t border-border/60"
        >
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-satoshi">
              Pensé pour vos équipes
            </h2>
            <p className="mt-3 text-muted-foreground">L'essentiel, sans surcharge.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Pilotage en temps réel', desc: 'CSAT, tendances et thèmes récurrents sur un tableau de bord clair.' },
              { icon: BellRing, title: 'Alertes immédiates', desc: 'SMS ou WhatsApp au chef d\'agence dès qu\'une note est critique.' },
              { icon: Sparkles, title: 'Analyse IA', desc: 'Le modèle lit les commentaires : sentiment, thèmes et urgence.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className="relative rounded-3xl border border-border/80 bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 hover-lift"
              >
                <span className="absolute top-6 right-6 text-5xl font-bold text-muted-foreground/15 font-satoshi">{i + 1}</span>
                <div className={`flex size-12 items-center justify-center rounded-2xl border ${i % 2 === 1 ? 'bg-warning/10 border-warning/25 text-warning' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold font-satoshi">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Chiffres clés — Counter existant */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, value: 10, suffix: 's', label: 'pour répondre' },
              { icon: Timer, prefix: '< ', value: 2, suffix: ' min', label: 'détection d\'un incident' },
              { icon: ShieldCheck, value: 100, suffix: '%', label: 'isolation des données' },
              { icon: Smartphone, value: 0, suffix: '', label: 'application à installer' },
            ].map(({ icon: Icon, value, prefix = '', suffix = '', label }, i) => (
              <motion.div
                key={label}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover-lift"
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${i % 2 === 1 ? 'bg-warning' : 'bg-primary'}`} />
                <div className={`mx-auto flex size-11 items-center justify-center rounded-2xl border ${i % 2 === 1 ? 'bg-warning/10 border-warning/25 text-warning' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                  <Icon className="size-5" />
                </div>
                <div className={`mt-3 text-3xl sm:text-4xl font-bold font-satoshi ${i % 2 === 1 ? 'text-warning' : 'text-primary'}`}>
                  <Counter value={value} prefix={prefix} suffix={suffix} />
                </div>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ===== CTA final ===== */}
        <motion.section
          id="contact"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-auto max-w-6xl px-6 py-10"
        >
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary to-brand-green-deep px-8 py-16 text-center text-primary-foreground">
            <div aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-warning/25 blur-3xl" />
            <div aria-hidden className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <ShieldCheck className="size-10 mx-auto opacity-80" />
              <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight font-satoshi">
                Prêt à écouter vos usagers ?
              </h2>
              <p className="mt-3 text-primary-foreground/85 max-w-xl mx-auto">
                Déployez les QR codes sur vos guichets et suivez la satisfaction en temps réel, dès aujourd'hui.
              </p>
              <div className="mt-8">
                {user ? (
                  <a href="/dashboard">
                    <Button size="lg" className="rounded-2xl bg-white text-primary hover:bg-white/90 px-8 gap-2 shadow-lg">
                      Ouvrir le tableau de bord <ArrowRight className="size-5" />
                    </Button>
                  </a>
                ) : (
                  <a href="/login">
                    <Button size="lg" className="btn-mint rounded-2xl px-8 gap-2 shadow-lg">
                      Commencer <ArrowRight className="size-5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* ===== Footer NOIR Mint ===== */}
      <footer className="border-t border-border/80 py-10 px-6 bg-[hsl(216_40%_12%)] text-white">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <YebaLogo className="size-6" />
            <span className="font-bold font-satoshi">{nom}</span>
            <span className="text-white/50">·</span>
            <span>Pilotage de la satisfaction client au guichet</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group inline-flex items-center gap-3"
              aria-label="Retour en haut de page"
            >
              <span className="text-sm font-medium uppercase tracking-wide text-white transition-colors group-hover:text-warning">
                Back to top
              </span>
              <ChevronRight size={20} className="text-white transition-colors group-hover:text-warning" aria-hidden="true" />
            </button>
            <a href="/login" className="hover:text-warning font-semibold transition-colors">
              Espace équipe
            </a>
          </div>
          <span className="text-white/40 text-xs">© {new Date().getFullYear()} {nom}</span>
        </div>
        <BandeauInstitutionnel />
        <div className="lisere-tricolore" aria-hidden="true" />
      </footer>
    </AmbientBackground>
  )
}