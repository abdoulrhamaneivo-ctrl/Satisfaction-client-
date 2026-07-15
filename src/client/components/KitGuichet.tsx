import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { CXSATLogo } from './CXSATLogo';
import { useToast } from '../hooks/use-toast';

type FormatKey = 'A5' | 'A4' | 'BADGE';

export const KitGuichet = ({ guichet }: { guichet: any }) => {
  const kitRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Utilise window.location.origin pour pointer automatiquement vers le bon hôte (dev, staging, production)
  const evalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/q/${guichet.id}`
    : `https://cxsat.ci/q/${guichet.id}`;

  const ussdCode = `*789*42*${guichet.id}#`;

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState<boolean>(true);
  const [selectedFormat, setSelectedFormat] = useState<FormatKey>('A5');

  // Config des styles en fonction du format d'affiche choisi par l'utilisateur
  const formatConfigs = {
    A5: {
      containerStyle: { width: '420px', minHeight: '594px', padding: '32px' },
      qrWrapperStyle: { height: '280px', width: '280px' },
      qrSizeClass: "h-64 w-64",
      titleClass: "text-2xl mb-1",
      subtitleClass: "text-base mb-5",
      logoSize: 32,
      logoClass: "size-8",
      scanTextClass: "text-xl mb-1",
      scanDescClass: "text-sm mb-4",
      ussdPaddingClass: "py-3 px-4 mt-4",
      label: "Format A5 (Affiche)",
    },
    A4: {
      containerStyle: { width: '595px', minHeight: '842px', padding: '48px' },
      qrWrapperStyle: { height: '410px', width: '410px' },
      qrSizeClass: "h-96 w-96",
      titleClass: "text-3xl font-black mb-2",
      subtitleClass: "text-lg mb-6",
      logoSize: 40,
      logoClass: "size-10",
      scanTextClass: "text-2xl mb-2",
      scanDescClass: "text-base mb-6",
      ussdPaddingClass: "py-4 px-6 mt-6",
      label: "Format A4 (Poster)",
    },
    BADGE: {
      containerStyle: { width: '240px', minHeight: '320px', padding: '16px' },
      qrWrapperStyle: { height: '180px', width: '180px' },
      qrSizeClass: "h-40 w-40",
      titleClass: "text-lg mb-0.5",
      subtitleClass: "text-xs mb-3",
      logoSize: 24,
      logoClass: "size-6",
      scanTextClass: "text-xs font-bold mb-0.5",
      scanDescClass: "text-[10px] leading-tight mb-2",
      ussdPaddingClass: "py-2 px-3 mt-2",
      label: "Badge / Sticker",
    },
  };

  const currentConfig = formatConfigs[selectedFormat];

  useEffect(() => {
    let active = true;
    setLoadingQr(true);
    const fetchQr = async () => {
      try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(evalUrl)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Response error');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active) {
            setQrDataUrl(reader.result as string);
            setLoadingQr(false);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Failed to pre-load QR code for export:', err);
        if (active) {
          setLoadingQr(false);
        }
      }
    };
    fetchQr();
    return () => {
      active = false;
    };
  }, [evalUrl]);

  const downloadKit = async () => {
    if (!kitRef.current) return;

    // Bug corrigé : si le QR n'a pas pu être pré-chargé (ex. coupure réseau
    // vers l'API externe de génération de QR), qrDataUrl reste vide et le
    // bouton devenait quand même cliquable (loadingQr passe à false même en
    // cas d'échec du fetch) → toPng() capturait une image cassée et
    // échouait silencieusement (l'erreur ne finissait que dans la console).
    if (!qrDataUrl) {
      toast({
        variant: 'destructive',
        title: 'QR Code non disponible',
        description: "Le QR code n'a pas pu être généré. Vérifiez votre connexion puis réessayez.",
      });
      return;
    }

    // Laisse le navigateur peindre une frame avant la capture : juste après
    // le chargement du QR, l'image peut être en mémoire mais pas encore
    // effectivement rendue à l'écran, ce qui produisait parfois une affiche
    // exportée avec un QR vide sans qu'aucune erreur ne soit levée.
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const dataUrl = await toPng(kitRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        // Bug corrigé : html-to-image tente par défaut d'inspecter et
        // d'inliner TOUTES les règles @font-face de la page (y compris les
        // polices Satoshi chargées globalement, hors de l'affiche) pour les
        // ré-embarquer en base64. Sur certaines polices/feuilles de style,
        // cette étape interne plante avec `TypeError: can't access property
        // "trim", e is undefined` (bug connu de html-to-image, voir
        // bubkoo/html-to-image#532), et toPng() rejette avant même de
        // produire une image — d'où l'échec systématique du téléchargement.
        // L'affiche n'a pas besoin des polices exactes du site (les classes
        // Tailwind utilisent déjà des fallbacks système), donc on désactive
        // entièrement l'embarquement de polices.
        skipFonts: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });
      const link = document.createElement('a');
      link.download = `affiche-cxsat-${selectedFormat.toLowerCase()}-${guichet.nom_guichet}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Erreur lors de la génération de l'affiche PNG:", err);
      toast({
        variant: 'destructive',
        title: "Échec de l'export de l'affiche",
        description: err?.message || 'Réessayez, ou utilisez "Copier le lien" en alternative.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sélecteur de format / dimension */}
      <div className="flex flex-wrap gap-2 justify-center print:hidden border-b border-border/60 pb-4">
        {(Object.keys(formatConfigs) as Array<FormatKey>).map((fmt) => (
          <button
            key={fmt}
            onClick={() => setSelectedFormat(fmt)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
              selectedFormat === fmt
                ? 'bg-primary text-primary-foreground border-primary shadow-premium-sm'
                : 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200'
            }`}
          >
            {formatConfigs[fmt].label}
          </button>
        ))}
      </div>

      {/* Wrapper responsive avec scroll horizontal pour éviter de casser la grille sur mobile */}
      <div className="w-full overflow-x-auto p-4 flex justify-center bg-neutral-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-border/80">
        <div
          ref={kitRef}
          style={currentConfig.containerStyle}
          className="kit-affiche shrink-0 rounded-2xl border-4 border-foreground bg-white text-center shadow-xl print:rounded-none print:border-black print:shadow-none"
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <CXSATLogo className={`${currentConfig.logoClass} text-foreground`} width={currentConfig.logoSize} height={currentConfig.logoSize} />
            <span className="text-sm font-bold uppercase tracking-widest text-neutral-500">
              CXSAT
            </span>
          </div>

          <h2 className={`${currentConfig.titleClass} font-extrabold leading-tight text-neutral-900`}>
            Votre avis compte !
          </h2>
          <p className={`${currentConfig.subtitleClass} font-semibold text-neutral-600`}>
            {guichet.nom_guichet}
          </p>

          <div 
            style={currentConfig.qrWrapperStyle}
            className="mx-auto mb-5 flex items-center justify-center rounded-xl border-4 border-neutral-900 bg-white p-3"
          >
            {loadingQr ? (
              <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                <Loader2 className="size-8 animate-spin" />
                <span className="text-xs font-semibold">Génération du QR...</span>
              </div>
            ) : (
              <img
                src={qrDataUrl}
                alt="QR Code d'évaluation"
                className="mx-auto block"
                style={{
                  width: selectedFormat === 'A4' ? '384px' : selectedFormat === 'A5' ? '256px' : '160px',
                  height: selectedFormat === 'A4' ? '384px' : selectedFormat === 'A5' ? '256px' : '160px',
                }}
              />
            )}
          </div>

          <p className={`${currentConfig.scanTextClass} font-extrabold uppercase tracking-wide text-neutral-900`}>
            Scannez ce QR Code
          </p>
          <p className={`${currentConfig.scanDescClass} font-medium text-neutral-600`}>
            Notez-nous en 10 secondes, après votre passage à ce guichet
          </p>

          <div className={`rounded-xl bg-neutral-100 px-4 ${currentConfig.ussdPaddingClass} print:border print:border-neutral-400 print:bg-white`}>
            <p className="text-xs font-semibold text-neutral-700">
              Pas de connexion internet ?
            </p>
            <p className="text-sm font-bold tracking-wide text-neutral-900 mt-1">
              Composez <span className="font-extrabold text-primary">{ussdCode}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center print:hidden">
        <motion.div whileTap={{ scale: loadingQr ? 1 : 0.95 }}>
          <Button onClick={downloadKit} disabled={loadingQr} className="gap-2">
            {loadingQr ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <Download size={16} /> Télécharger ({selectedFormat})
              </>
            )}
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(evalUrl)} className="gap-2">
            <Share2 size={16} /> Copier le lien
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
