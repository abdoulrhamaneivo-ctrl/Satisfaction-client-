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
  CheckCircle,
  Zap,
  Clock,
  Sparkles,
  Users,
  Store,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Building2,
  Shield,
  Layers
} from 'lucide-react';
import { AmbientBackground } from '../components/AmbientBackground';
import { Card, Eyebrow, Reveal, Button } from '../components/ds';
import { useBrand } from '../context/BrandContext';

export const LandingPage = () => {
  const { data: user } = useAuth();
  const { brandConfig } = useBrand();

  const [activeTab, setActiveTab] = useState<'KANBAN' | 'CSAT' | 'GUICHETS'>('KANBAN');

  return (
    <AmbientBackground className="ds-grid-bg min-h-screen text-foreground overflow-x-hidden flex flex-col justify-between">
      {/* Hero Ambient Radial Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <div className="ds-hero-glow h-[550px] w-[550px] sm:h-[800px] sm:w-[800px]" />
      </div>

      {/* Trovy Header / Navigation */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-card/80 border-b border-border/80 transition-all">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {brandConfig?.logo_url ? (
              <img src={brandConfig.logo_url} alt={brandConfig.platform_name} className="h-8 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary font-black font-satoshi text-lg shadow-sm">
                  Y
                </div>
                <span className="text-xl font-black tracking-tight text-foreground font-satoshi">
                  {brandConfig?.platform_name || "Yeba"}
                </span>
              </div>
            )}
            <span className="hidden sm:inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
              Satisfaction Client
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-muted-foreground">
            <a href="#aperçu" className="hover:text-foreground transition-colors">Produit</a>
            <a href="#benefices" className="hover:text-foreground transition-colors">Bénéfices</a>
            <a href="#fonctionnalites" className="hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#securite" className="hover:text-foreground transition-colors">Sécurité & RLS</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <a href="/dashboard">
                <Button size="sm" className="rounded-xl font-extrabold gap-2 shadow-premium-sm">
                  <LayoutDashboard className="size-4" />
                  Tableau de bord
                </Button>
              </a>
            ) : (
              <a href="/login">
                <Button size="sm" className="rounded-xl font-extrabold gap-2 shadow-premium-sm">
                  <LogIn className="size-4" />
                  Connexion
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 py-10 lg:py-16 flex-1 space-y-24">
        
        {/* HERO SECTION WITH TROVY TITLE & SUBTITLE */}
        <section className="text-center space-y-6 max-w-4xl mx-auto pt-4">
          <Reveal direction="down">
            <div className="flex justify-center">
              <Eyebrow tone="amber">
                <Sparkles className="size-3" />
                L'assistant automatise le suivi au guichet, sans prendre le contrôle.
              </Eyebrow>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] font-satoshi text-foreground">
              Le calme opérationnel à vos guichets.{' '}
              <span className="bg-gradient-to-r from-primary via-teal-400 to-secondary bg-clip-text text-transparent block sm:inline">
                Et de la vitesse en plus.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-base sm:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
              Recueillez l'avis direct de vos clients par QR Code & USSD. Neutralisez les insatisfactions avant qu'elles n'impactent votre agence.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              {user ? (
                <a href="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-2xl py-6 px-8 text-base font-black gap-2 shadow-premium-md">
                    Accéder au Tableau de bord <ArrowRight className="size-5" />
                  </Button>
                </a>
              ) : (
                <a href="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-2xl py-6 px-8 text-base font-black gap-2 shadow-premium-md">
                    Se connecter <ArrowRight className="size-5" />
                  </Button>
                </a>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" /> 1 agence • guichets illimités
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" /> Aucune carte bancaire
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" /> Configuration en 2 minutes
              </span>
            </div>
          </Reveal>
        </section>

        {/* TROVY MAC-STYLE INTERACTIVE WINDOW SHOWCASE */}
        <section id="aperçu" className="pt-2">
          <Reveal delay={0.35}>
            <div className="relative mx-auto max-w-5xl rounded-[28px] border border-border/80 bg-[#0B191E] p-2.5 sm:p-4 shadow-2xl ring-1 ring-white/10 overflow-hidden">
              
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
                    Rechercher dans Yeba...
                  </span>
                  <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-slate-300">⌘K</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Agence Plateau (Abidjan)</span>
                </div>
              </div>

              {/* Window Inner App Replica */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-white p-2">
                {/* Left Sidebar Replica */}
                <div className="md:col-span-3 space-y-4 border-r border-white/10 pr-3 hidden md:block">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <Building2 className="size-5 text-primary" />
                    <div>
                      <span className="block font-black text-xs font-satoshi">Yeba Enterprise</span>
                      <span className="block text-[10px] text-slate-400">Agence Principale</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-bold text-slate-400">
                    <button 
                      onClick={() => setActiveTab('KANBAN')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'KANBAN' ? 'bg-primary/20 text-primary border border-primary/30 font-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="flex items-center gap-2"><Zap className="size-4" /> Alertes Kanban</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">3</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('CSAT')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'CSAT' ? 'bg-primary/20 text-primary border border-primary/30 font-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="flex items-center gap-2"><BarChart3 className="size-4" /> Tableau CSAT</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">94%</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('GUICHETS')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'GUICHETS' ? 'bg-primary/20 text-primary border border-primary/30 font-black' : 'hover:bg-white/5'}`}
                    >
                      <span className="flex items-center gap-2"><Store className="size-4" /> Guichets & Kits</span>
                      <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full font-bold">12</span>
                    </button>
                  </div>
                </div>

                {/* Main Content Replica */}
                <div className="md:col-span-9 space-y-4">
                  {/* Top Bar inside Replica */}
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vue en direct</span>
                      <h3 className="text-base font-black font-satoshi">
                        {activeTab === 'KANBAN' && 'Suivi des Incidents & Plan Correctif'}
                        {activeTab === 'CSAT' && 'Indicateurs de Satisfaction (CSAT)'}
                        {activeTab === 'GUICHETS' && 'Points de Contact & QR Codes'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-xl">
                        Mono-Agence Live
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
                        {/* Column 1: A Faire */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 pb-1">
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> À Traiter</span>
                            <span className="text-[10px] font-bold">2</span>
                          </div>
                          <div className="bg-slate-900/90 border border-amber-500/30 p-3 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">Caisse 2</span>
                            <p className="text-xs font-bold">Attente jugée trop longue (&gt;15 min)</p>
                            <span className="text-[10px] text-slate-400 block pt-1">Il y a 12 minutes</span>
                          </div>
                          <div className="bg-slate-900/90 border border-white/10 p-3 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold bg-secondary/20 text-secondary px-2 py-0.5 rounded-full border border-secondary/30">Accueil</span>
                            <p className="text-xs font-bold">Information manque de clarté</p>
                            <span className="text-[10px] text-slate-400 block pt-1">Il y a 45 minutes</span>
                          </div>
                        </div>

                        {/* Column 2: En Cours */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 pb-1">
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> En Cours</span>
                            <span className="text-[10px] font-bold">1</span>
                          </div>
                          <div className="bg-slate-900/90 border border-primary/30 p-3 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">Guichet 4</span>
                            <p className="text-xs font-bold">Problème d'impression des reçus</p>
                            <span className="text-[10px] text-slate-400 block pt-1">Pris en charge par Agent K.</span>
                          </div>
                        </div>

                        {/* Column 3: Résolu */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 pb-1">
                            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" /> Résolu</span>
                            <span className="text-[10px] font-bold">5</span>
                          </div>
                          <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Caisse 1</span>
                            <p className="text-xs font-bold">Fluidité du guichet rétablie</p>
                            <span className="text-[10px] text-slate-400 block pt-1">Résolu aujourd'hui à 11:20</span>
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
                          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Score CSAT</span>
                            <span className="block text-2xl font-black text-emerald-400 font-satoshi">94.8%</span>
                          </div>
                          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Avis Collectés</span>
                            <span className="block text-2xl font-black text-primary font-satoshi">1 428</span>
                          </div>
                          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Temps Moyen</span>
                            <span className="block text-2xl font-black text-secondary font-satoshi">1.8h</span>
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center py-6">
                          <TrendingUp className="size-8 text-primary mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-300">Tendance de satisfaction en hausse (+4.2% ce mois-ci)</p>
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
                            <span className="font-bold text-xs block">Guichet Caisse 1</span>
                            <span className="text-[10px] text-slate-400">Kit QR & USSD actif</span>
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                          <div className="p-3 bg-secondary/20 text-secondary rounded-xl border border-secondary/30">
                            <QrCode className="size-6" />
                          </div>
                          <div>
                            <span className="font-bold text-xs block">Guichet Accueil</span>
                            <span className="text-[10px] text-slate-400">Kit QR & USSD actif</span>
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

        {/* TROVY "CE QUE VOUS GAGNEZ" SECTION LAYOUT */}
        <section id="benefices" className="pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Big Editorial Column */}
            <div className="lg:col-span-5 space-y-6">
              <Reveal direction="down">
                <Eyebrow tone="amber">CE QUE VOUS GAGNEZ</Eyebrow>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="text-3xl sm:text-5xl font-black font-satoshi tracking-tight leading-[1.15] text-foreground">
                  Le calme opérationnel. <br />
                  <span className="text-muted-foreground font-semibold">Et de la vitesse en plus.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
                  Moins de bruit, moins de réclamations non traitées, plus de décisions prises au bon moment par le Chef d'Agence.
                </p>
              </Reveal>
            </div>

            {/* Right 4 Bento Feature Cards Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Reveal delay={0.15}>
                <Card variant="feature" className="p-6 rounded-3xl h-full space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary">
                    <Clock className="size-5" />
                  </div>
                  <h3 className="text-base font-black font-satoshi text-foreground">Du temps rendu à l'équipe</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Automatisez les comptes-rendus, la détection des dérives au guichet et le suivi répétitif des réclamations.
                  </p>
                </Card>
              </Reveal>

              <Reveal delay={0.25}>
                <Card variant="feature" className="p-6 rounded-3xl h-full space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-secondary/15 border border-secondary/30 text-secondary">
                    <Zap className="size-5" />
                  </div>
                  <h3 className="text-base font-black font-satoshi text-foreground">Une exécution plus fluide</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Chaque agent et chef d'agence connaît la priorité du jour, le contexte de la caisse et la prochaine action.
                  </p>
                </Card>
              </Reveal>

              <Reveal delay={0.35}>
                <Card variant="feature" className="p-6 rounded-3xl h-full space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="size-5" />
                  </div>
                  <h3 className="text-base font-black font-satoshi text-foreground">Une source de vérité unique</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Avis clients, données de fréquentation et tickets de réclamation restent reliés sans double saisie.
                  </p>
                </Card>
              </Reveal>

              <Reveal delay={0.45}>
                <Card variant="feature" className="p-6 rounded-3xl h-full space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-warning/15 border border-warning/30 text-warning">
                    <Layers className="size-5" />
                  </div>
                  <h3 className="text-base font-black font-satoshi text-foreground">Un suivi sans micro-management</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Les indicateurs donnent de la visibilité sur l'agence sans interrompre le travail sur le terrain.
                  </p>
                </Card>
              </Reveal>
            </div>

          </div>

          {/* Bottom 4 Key Metrics Bar (Exact Trovy Style) */}
          <Reveal delay={0.5}>
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="feature" className="p-6 rounded-3xl text-left space-y-1">
                <span className="block text-3xl sm:text-4xl font-black text-foreground font-satoshi">94.8%</span>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">CSAT CIBLE ATTEINT</span>
              </Card>
              <Card variant="feature" className="p-6 rounded-3xl text-left space-y-1">
                <span className="block text-3xl sm:text-4xl font-black text-primary font-satoshi">&lt; 2 min</span>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">ALERTE INSTANTANÉE</span>
              </Card>
              <Card variant="feature" className="p-6 rounded-3xl text-left space-y-1">
                <span className="block text-3xl sm:text-4xl font-black text-secondary font-satoshi">1</span>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">ESPACE UNIFIÉ</span>
              </Card>
              <Card variant="feature" className="p-6 rounded-3xl text-left space-y-1">
                <span className="block text-3xl sm:text-4xl font-black text-emerald-400 font-satoshi">0</span>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">APPLICATION REQUISE</span>
              </Card>
            </div>
          </Reveal>
        </section>

        {/* SECURITY & RLS SECTION */}
        <section id="securite">
          <Reveal delay={0.2}>
            <Card variant="feature" className="p-8 sm:p-12 rounded-3xl bg-card/90">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <Eyebrow tone="emerald">SÉCURITÉ & ARCHITECTURE</Eyebrow>
                  <h2 className="text-2xl sm:text-4xl font-black font-satoshi">
                    Architecture Mono-Entreprise & Row Level Security (RLS)
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-2xl">
                    Vos données de satisfaction sont strictement isolées. La hiérarchie Entreprise → Agence → Guichet garantit qu'aucun agent ne peut accéder aux métriques d'un guichet non autorisé.
                  </p>
                </div>
                <div className="lg:col-span-4 flex justify-end">
                  <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center w-full space-y-2">
                    <Shield className="size-10 text-primary mx-auto" />
                    <span className="block text-sm font-black font-satoshi">100% Hermétique</span>
                    <span className="text-[11px] text-muted-foreground font-medium block">Comptes créés uniquement par invitation.</span>
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>
        </section>

      </main>

      {/* Trovy Footer */}
      <footer className="relative z-10 w-full border-t border-border/80 bg-card/60 py-10 px-6 backdrop-blur-md">
        <div className="mx-auto max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary font-black font-satoshi text-sm">
              Y
            </div>
            <span className="font-extrabold text-foreground font-satoshi text-sm">
              {brandConfig?.platform_name || "Yeba"}
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span>Pilotage de la Satisfaction Client au Guichet</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="/login" className="hover:text-foreground transition-colors font-bold">Connexion Espace Client</a>
          </div>

          <div>
            © {new Date().getFullYear()} Yeba. Tous droits réservés.
          </div>
        </div>
      </footer>
    </AmbientBackground>
  );
};
