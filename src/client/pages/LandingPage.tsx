import React, { useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  BarChart3, 
  ShieldCheck, 
  ArrowRight, 
  LogIn, 
  LayoutDashboard,
  Zap,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  TrendingUp,
  Building2,
  Shield,
  Layers,
  MapPin,
  CheckCircle
} from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { Card, Eyebrow, Reveal, Button } from '../components/ds';
import { useBrand } from '../context/BrandContext';
import { YebaLogo } from '../components/YebaLogo';

export const LandingPage = () => {
  const { data: user } = useAuth();
  const { brandConfig } = useBrand();

  const [activeTab, setActiveTab] = useState<'KANBAN' | 'CSAT' | 'GUICHETS'>('KANBAN');

  return (
    <AmbientBackground className="ds-grid-bg min-h-screen text-foreground overflow-x-hidden flex flex-col justify-between">
      {/* Hero Ambient Radial Glow (Jaune Or + Vert Émeraude) */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <div className="ds-hero-glow h-[550px] w-[550px] sm:h-[800px] sm:w-[800px]" />
      </div>

      {/* Senior Header Navigation — La Poste CI Edition */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-card/85 border-b border-border/80 transition-all shadow-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <YebaLogo className="size-9" />
              <div>
                <span className="text-xl font-black tracking-tight text-foreground font-satoshi block leading-none">
                  {brandConfig?.platform_name || "Yéba"}
                </span>
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase block pt-0.5">
                  Plateforme Satisfaction Client
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Mono-Entreprise Live
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-muted-foreground">
            <a href="#aperçu" className="hover:text-foreground transition-colors">Produit</a>
            <a href="#benefices" className="hover:text-foreground transition-colors">Bénéfices Guichets</a>
            <a href="#fonctionnalites" className="hover:text-foreground transition-colors">Suivi & Kanban</a>
            <a href="#securite" className="hover:text-foreground transition-colors">Sécurité RLS</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <a href="/dashboard">
                <Button size="sm" className="rounded-xl font-extrabold gap-2 shadow-premium bg-primary text-primary-foreground hover:bg-primary/90">
                  <LayoutDashboard className="size-4" />
                  Tableau de bord
                </Button>
              </a>
            ) : (
              <a href="/login">
                <Button size="sm" className="rounded-xl font-extrabold gap-2 shadow-premium bg-primary text-primary-foreground hover:bg-primary/90">
                  <LogIn className="size-4" />
                  Espace Agent / Chef
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 py-10 lg:py-16 flex-1 space-y-24">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-6 max-w-4xl mx-auto pt-4">
          <Reveal direction="down">
            <div className="flex justify-center">
              <Eyebrow tone="amber">
                <Sparkles className="size-3" />
                YÉBA • PILOTAGE EN TEMPS RÉEL DU SERVICE CLIENT AU GUICHET
              </Eyebrow>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] font-satoshi text-foreground">
              Le calme opérationnel à vos guichets.{' '}
              <span className="bg-gradient-to-r from-primary via-amber-300 to-secondary bg-clip-text text-transparent block sm:inline">
                Et de la vitesse en plus.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-base sm:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
              Mesurez en temps réel la satisfaction des usagers dans vos agences via QR Code & USSD. Neutralisez les insatisfactions avant qu'elles ne remontent au niveau supérieur.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              {user ? (
                <a href="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-2xl py-6 px-8 text-base font-black gap-2 shadow-premium bg-primary text-primary-foreground hover:bg-primary/90">
                    Accéder au Tableau de bord <ArrowRight className="size-5" />
                  </Button>
                </a>
              ) : (
                <a href="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-2xl py-6 px-8 text-base font-black gap-2 shadow-premium bg-primary text-primary-foreground hover:bg-primary/90">
                    Se connecter à l'Espace Agence <ArrowRight className="size-5" />
                  </Button>
                </a>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" /> Multi-guichets illimités
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-secondary" /> Scan QR & USSD sans application
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" /> RLS Mono-Entreprise Sécurisé
              </span>
            </div>
          </Reveal>
        </section>

        {/* BESPOKE MAC-STYLE INTERACTIVE WINDOW SHOWCASE */}
        <section id="aperçu" className="pt-2">
          <Reveal delay={0.35}>
            <div className="relative mx-auto max-w-5xl rounded-[28px] border border-border/80 bg-[#071114] p-2.5 sm:p-4 shadow-2xl ring-1 ring-white/10 overflow-hidden">
              
              {/* Window Controls Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 px-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                
                <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-1.5 text-xs text-slate-400 w-64 sm:w-80 justify-between">
                  <span className="flex items-center gap-2 font-mono text-[11px]">
                    <Search className="size-3.5 text-slate-500" />
                    Rechercher une agence ou un guichet...
                  </span>
                  <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-slate-300">⌘K</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <MapPin className="size-3.5 text-primary" />
                  <span className="hidden sm:inline">Agence Plateau — Abidjan</span>
                </div>
              </div>

              {/* Window Inner App Replica */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-white p-2">
                {/* Left Sidebar Replica */}
                <div className="md:col-span-3 space-y-4 border-r border-white/10 pr-3 hidden md:block">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <YebaLogo className="size-7" />
                    <div>
                      <span className="block font-black text-xs font-satoshi text-primary">Plateforme Yéba</span>
                      <span className="block text-[10px] text-slate-400">Espace Chef d'Agence</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-bold text-slate-400">
                    <button 
                      onClick={() => setActiveTab('KANBAN')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'KANBAN' ? 'bg-primary/20 text-primary border border-primary/30 font-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="flex items-center gap-2"><Zap className="size-4" /> Alertes & Incidents</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">3</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('CSAT')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'CSAT' ? 'bg-secondary/20 text-secondary border border-secondary/30 font-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="flex items-center gap-2"><BarChart3 className="size-4" /> Taux de Satisfaction</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">96.2%</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('GUICHETS')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'GUICHETS' ? 'bg-white/10 text-white border border-white/20 font-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="flex items-center gap-2"><Building2 className="size-4" /> Guichets & Kits QR</span>
                      <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full font-bold">8</span>
                    </button>
                  </div>
                </div>

                {/* Main Content Replica */}
                <div className="md:col-span-9 space-y-4">
                  {/* Top Bar inside Replica */}
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Vue Temps Réel • Guichets & Services</span>
                      <h3 className="text-base font-black font-satoshi">
                        {activeTab === 'KANBAN' && 'Suivi des Incidents Guichets & Actions Correctives'}
                        {activeTab === 'CSAT' && 'Indicateurs Globaux CSAT — Réseau d’Agences'}
                        {activeTab === 'GUICHETS' && 'Cartographie des Guichets & Kits QR/USSD'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1 rounded-xl flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-secondary animate-pulse" />
                        Guichets Actifs
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Switchable Content */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'KANBAN' && (
                      <motion.div 
                        key="kanban"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                      >
                        {/* Column 1: A Traiter */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 pb-1">
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> À Traiter</span>
                            <span className="text-[10px] font-bold">2</span>
                          </div>
                          <div className="bg-slate-900/90 border border-amber-500/40 p-3 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">Caisse Courrier 2</span>
                            <p className="text-xs font-bold text-slate-200">Temps d'attente estimé élevé</p>
                            <span className="text-[10px] text-slate-400 block pt-1">Signalé par Usager à 14:10</span>
                          </div>
                          <div className="bg-slate-900/90 border border-white/10 p-3 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold bg-secondary/20 text-secondary px-2 py-0.5 rounded-full border border-secondary/30">Accueil Colis</span>
                            <p className="text-xs font-bold text-slate-200">Demande d'information tarifaire</p>
                            <span className="text-[10px] text-slate-400 block pt-1">Il y a 22 minutes</span>
                          </div>
                        </div>

                        {/* Column 2: En Cours */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 pb-1">
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary animate-pulse" /> En Cours</span>
                            <span className="text-[10px] font-bold">1</span>
                          </div>
                          <div className="bg-slate-900/90 border border-primary/40 p-3 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">Guichet Chronopost</span>
                            <p className="text-xs font-bold text-slate-200">Réapprovisionnement de reçus</p>
                            <span className="text-[10px] text-slate-400 block pt-1">Pris en charge par Agent Y.</span>
                          </div>
                        </div>

                        {/* Column 3: Résolu */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 pb-1">
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" /> Résolu</span>
                            <span className="text-[10px] font-bold">8</span>
                          </div>
                          <div className="bg-slate-900/90 border border-emerald-500/40 p-3 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Caisse Mandat 1</span>
                            <p className="text-xs font-bold text-slate-200">Fluidité rétablie avec succès</p>
                            <span className="text-[10px] text-slate-400 block pt-1">Résolu à 12:45</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'CSAT' && (
                      <motion.div 
                        key="csat"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Score CSAT Global</span>
                            <span className="block text-2xl font-black text-emerald-400 font-satoshi">96.2%</span>
                          </div>
                          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Avis Usagers Collectés</span>
                            <span className="block text-2xl font-black text-primary font-satoshi">3 840</span>
                          </div>
                          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Délai Traitement</span>
                            <span className="block text-2xl font-black text-secondary font-satoshi">1.2h</span>
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center py-6">
                          <TrendingUp className="size-8 text-primary mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-200">Satisfaction usagers en hausse constante (+5.8% ce trimestre dans les agences d'Abidjan)</p>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'GUICHETS' && (
                      <motion.div 
                        key="guichets"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                          <div className="p-3 bg-primary/20 text-primary rounded-xl border border-primary/30">
                            <QrCode className="size-6" />
                          </div>
                          <div>
                            <span className="font-bold text-xs block text-slate-100">Guichet Caisse 1 — Plateau</span>
                            <span className="text-[10px] text-slate-400">Kit QR Code & Code USSD configurés</span>
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                          <div className="p-3 bg-secondary/20 text-secondary rounded-xl border border-secondary/30">
                            <QrCode className="size-6" />
                          </div>
                          <div>
                            <span className="font-bold text-xs block text-slate-100">Guichet Envoi Colis — Cocody</span>
                            <span className="text-[10px] text-slate-400">Kit QR Code & Code USSD configurés</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </Reveal>
        </section>

        {/* BESPOKE BENTO FEATURE CARDS GRID — LA POSTE CI */}
        <section id="benefices" className="pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Big Editorial Column */}
            <div className="lg:col-span-5 space-y-6">
              <Reveal direction="down">
                <Eyebrow tone="amber">BÉNÉFICES OPÉRATIONNELS</Eyebrow>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="text-3xl sm:text-5xl font-black font-satoshi tracking-tight leading-[1.15] text-foreground">
                  Le calme au guichet. <br />
                  <span className="text-muted-foreground font-semibold">Une excellence de service mesurable.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
                  Offrez à vos chefs d'agence et agents de guichet un outil clair de suivi de la qualité de service, adapté aux contraintes du terrain.
                </p>
              </Reveal>
            </div>

            {/* Right 4 Bento Feature Cards Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Reveal delay={0.15}>
                <Card variant="feature" className="p-6 rounded-3xl h-full space-y-3 border-primary/30 hover:border-primary/60 transition-all duration-300">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary">
                    <Clock className="size-5" />
                  </div>
                  <h3 className="text-base font-black font-satoshi text-foreground">Gain de temps au guichet</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Recueil immédiat des retours usagers en 10 secondes via QR Code ou USSD sans ralentir les opérations.
                  </p>
                </Card>
              </Reveal>

              <Reveal delay={0.25}>
                <Card variant="feature" className="p-6 rounded-3xl h-full space-y-3 border-secondary/30 hover:border-secondary/60 transition-all duration-300">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-secondary/15 border border-secondary/30 text-secondary">
                    <Zap className="size-5" />
                  </div>
                  <h3 className="text-base font-black font-satoshi text-foreground">Réactivité Instantanée</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Détection automatique des insatisfactions et création instantanée de cartes de suivi sur le tableau Kanban agence.
                  </p>
                </Card>
              </Reveal>

              <Reveal delay={0.35}>
                <Card variant="feature" className="p-6 rounded-3xl h-full space-y-3 border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="size-5" />
                  </div>
                  <h3 className="text-base font-black font-satoshi text-foreground">Isolation RLS des Données</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Chaque agence accède exclusivement aux métriques de ses propres guichets grâce à la sécurité au niveau des lignes.
                  </p>
                </Card>
              </Reveal>

              <Reveal delay={0.45}>
                <Card variant="feature" className="p-6 rounded-3xl h-full space-y-3 border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Sparkles className="size-5" />
                  </div>
                  <h3 className="text-base font-black font-satoshi text-foreground">Analyse IA (NVIDIA NIM)</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Détection automatique des sentiments, synthèses instantanées et qualification des urgences grâce aux LLM Qwen 80B.
                  </p>
                </Card>
              </Reveal>
            </div>

          </div>

          {/* Bottom Key Metrics Bar — Signature La Poste CI */}
          <Reveal delay={0.5}>
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="feature" className="p-6 rounded-3xl text-left space-y-1 border-primary/30">
                <span className="block text-3xl sm:text-4xl font-black text-primary font-satoshi">96.2%</span>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">CSAT MOYEN AGENCES</span>
              </Card>
              <Card variant="feature" className="p-6 rounded-3xl text-left space-y-1 border-secondary/30">
                <span className="block text-3xl sm:text-4xl font-black text-secondary font-satoshi">&lt; 2 min</span>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">DÉTECTION INCIDENTS</span>
              </Card>
              <Card variant="feature" className="p-6 rounded-3xl text-left space-y-1 border-primary/30">
                <span className="block text-3xl sm:text-4xl font-black text-foreground font-satoshi">100%</span>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">MONO-ENTREPRISE SECURE</span>
              </Card>
              <Card variant="feature" className="p-6 rounded-3xl text-left space-y-1 border-secondary/30">
                <span className="block text-3xl sm:text-4xl font-black text-emerald-400 font-satoshi">0</span>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">APPLICATION À TÉLÉCHARGER</span>
              </Card>
            </div>
          </Reveal>
        </section>

        {/* SECURITY & RLS SECTION */}
        <section id="securite">
          <Reveal delay={0.2}>
            <Card variant="feature" className="p-8 sm:p-12 rounded-3xl bg-card/90 border-primary/30">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <Eyebrow tone="positive">SÉCURITÉ & ARCHITECTURE ENTREPRISE</Eyebrow>
                  <h2 className="text-2xl sm:text-4xl font-black font-satoshi">
                    Conformité Mono-Entreprise & Row Level Security (RLS)
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-2xl">
                    L'architecture Yéba garantit la confidentialité stricte des données de satisfaction de votre entreprise. Les autorisations sont attribuées selon la hiérarchie Entreprise → Agence → Guichet.
                  </p>
                </div>
                <div className="lg:col-span-4 flex justify-end">
                  <div className="p-6 rounded-2xl bg-primary/10 border border-primary/30 text-center w-full space-y-2">
                    <Shield className="size-10 text-primary mx-auto" />
                    <span className="block text-sm font-black font-satoshi">Comptes sur Invitation</span>
                    <span className="text-[11px] text-muted-foreground font-medium block">Gestion stricte du personnel agence par le Chef d'Agence.</span>
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>
        </section>

      </main>

      {/* Senior Footer */}
      <footer className="relative z-10 w-full border-t border-border/80 bg-card/60 py-10 px-6 backdrop-blur-md">
        <div className="mx-auto max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-3">
            <YebaLogo className="size-6" />
            <span className="font-extrabold text-foreground font-satoshi text-sm">
              {brandConfig?.platform_name || "Yéba"}
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span>Plateforme de Pilotage de la Satisfaction Client au Guichet</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="/login" className="hover:text-primary transition-colors font-bold">Espace Agent / Connexion</a>
          </div>

          <div>
            © {new Date().getFullYear()} Yéba. Tous droits réservés.
          </div>
        </div>
      </footer>
    </AmbientBackground>
  );
};
