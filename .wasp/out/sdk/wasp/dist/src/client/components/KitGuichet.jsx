import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Download, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { useBrand } from '../context/BrandContext';
import { BrandLogo } from './BrandLogo';
export const KitGuichet = ({ guichet }) => {
    const kitRef = useRef(null);
    const { toast } = useToast();
    const { brandConfig } = useBrand();
    // QR opaque (Doc 11 §7) : le code imprimé est code_public — jamais l'ID
    // interne. Repli sur l'ID pour un guichet créé avant la migration (backfill
    // normalement garantit un code, ce repli est purement défensif).
    const codeQr = guichet.code_public || String(guichet.id);
    const evalUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/q/${codeQr}`
        : `https://yeba.ci/q/${codeQr}`;
    const ussdCode = `*789*42*${guichet.id}#`;
    const [selectedFormat, setSelectedFormat] = useState('A5');
    // QR 100% LOCAL (FIX 05/09) : l'ancien code récupérait le PNG depuis
    // api.qrserver.com via fetch — bloqué par connect-src 'self' de notre CSP
    // (kit vide), dépendance externe fragile et fuite des URLs d'avis vers un
    // tiers. qrcode.react génère le SVG dans le navigateur : fonctionne
    // hors-ligne en agence, aucun appel réseau, export PNG via html-to-image
    // qui sérialise le SVG inline. Noir sur blanc volontaire : les couleurs
    // fantaisie dégradent la lecture par les scanners.
    const qrPx = selectedFormat === 'A4' ? 384 : selectedFormat === 'A5' ? 256 : 160;
    // Personnalisation QR (FIX 05/09) : chaque réglage a un effet visible.
    // Couleurs validées HEX côté contexte (repli noir/blanc = QR toujours
    // lisible). Styles : CLASSIQUE = sobre, MODERNE = cadre arrondi + ombre,
    // PREMIUM = logo de l'entreprise incrusté + double cadre. Cadre : AUCUN =
    // QR seul, SIMPLE = encadré, PREMIUM = double anneau.
    const qrFg = brandConfig?.qr_color || '#111111';
    const qrBg = brandConfig?.qr_bg_color || '#ffffff';
    const qrStyle = brandConfig?.qr_style || 'CLASSIQUE';
    const qrFrame = brandConfig?.qr_frame || 'SIMPLE';
    const qrLogo = brandConfig?.logo_url && String(brandConfig.logo_url).startsWith('http')
        ? String(brandConfig.logo_url)
        : null;
    const cadreClasse = qrFrame === 'AUCUN'
        ? 'mx-auto mb-5 flex items-center justify-center bg-white p-1'
        : qrFrame === 'PREMIUM'
            ? 'mx-auto mb-5 flex items-center justify-center rounded-3xl border-4 border-neutral-900 bg-white p-3 shadow-xl ring-4 ring-primary/30'
            : qrStyle === 'MODERNE'
                ? 'mx-auto mb-5 flex items-center justify-center rounded-3xl border-2 border-neutral-800 bg-white p-4 shadow-lg'
                : 'mx-auto mb-5 flex items-center justify-center rounded-xl border-4 border-neutral-900 bg-white p-3 shadow-inner';
    const formatConfigs = {
        A5: {
            containerStyle: { width: '420px', minHeight: '594px', padding: '32px' },
            qrWrapperStyle: { height: '280px', width: '280px' },
            qrSizeClass: "h-64 w-64",
            titleClass: "text-2xl mb-1",
            subtitleClass: "text-base mb-5",
            logoSize: 32,
            logoClass: "h-8 max-w-[120px]",
            scanTextClass: "text-xl mb-1",
            scanDescClass: "text-sm mb-4",
            ussdPaddingClass: "py-3 px-4 mt-4",
            label: "Format A5 (Affiche)",
        },
        A4: {
            containerStyle: { width: '595px', minHeight: '842px', padding: '48px' },
            qrWrapperStyle: { height: '410px', width: '410px' },
            qrSizeClass: "h-96 w-96",
            titleClass: "text-3xl font-bold mb-2",
            subtitleClass: "text-lg mb-6",
            logoSize: 40,
            logoClass: "h-10 max-w-[160px]",
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
            logoClass: "h-6 max-w-[80px]",
            scanTextClass: "text-xs font-bold mb-0.5",
            scanDescClass: "text-[10px] leading-tight mb-2",
            ussdPaddingClass: "py-2 px-3 mt-2",
            label: "Badge / Sticker",
        },
    };
    const currentConfig = formatConfigs[selectedFormat];
    const downloadKit = async () => {
        if (!kitRef.current)
            return;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        try {
            const targetWidth = parseInt(currentConfig.containerStyle.width, 10) || 420;
            const dataUrl = await toPng(kitRef.current, {
                pixelRatio: 2,
                cacheBust: true,
                skipFonts: true,
                width: targetWidth,
                style: {
                    transform: 'none',
                    transformOrigin: 'top left',
                    margin: '0 auto',
                },
            });
            const link = document.createElement('a');
            link.download = `affiche-${(brandConfig?.platform_name || "yeba").toLowerCase()}-${selectedFormat.toLowerCase()}-${guichet.nom_guichet}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        catch (err) {
            console.error("Erreur lors de la génération de l'affiche PNG:", err);
            toast({
                variant: 'destructive',
                title: "Échec de l'export de l'affiche",
                description: err?.message || 'Réessayez, ou utilisez "Copier le lien" en alternative.',
            });
        }
    };
    const primaryColorStyle = brandConfig ? { borderColor: `hsl(${brandConfig.color_primary})` } : {};
    return (<div className="space-y-6">
      {/* Sélecteur de format / dimension */}
      <div className="flex flex-wrap gap-2 justify-center print:hidden border-b border-border/60 pb-4">
        {Object.keys(formatConfigs).map((fmt) => (<Button key={fmt} type="button" variant={selectedFormat === fmt ? 'default' : 'outline'} onClick={() => setSelectedFormat(fmt)} className={selectedFormat === fmt ? 'rounded-xl shadow-sm font-bold' : 'rounded-xl'}>
            {formatConfigs[fmt].label}
          </Button>))}
      </div>

      {/* Wrapper responsive avec scroll horizontal & centrage pour aperçu mobile parfait */}
      <div className="w-full overflow-x-auto momentum-scroll scroll-fade-x p-4 sm:p-6 bg-neutral-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-border/80 flex justify-center items-center">
        <div className="shrink-0 max-w-full">
          <div ref={kitRef} style={{ ...currentConfig.containerStyle, ...primaryColorStyle }} className="kit-affiche mx-auto rounded-2xl border-4 bg-white text-center shadow-xl print:rounded-none print:border-black print:shadow-none transition-all duration-200">
            <div className="mb-4 flex items-center justify-center gap-2">
              <BrandLogo className={currentConfig.logoClass} height={currentConfig.logoSize}/>
              <span className="text-sm font-bold uppercase tracking-widest text-neutral-500">
                {brandConfig?.platform_name || "Yeba"}
              </span>
            </div>

            <h2 className={`${currentConfig.titleClass} font-bold leading-tight text-neutral-900`}>
              {brandConfig?.form_title || "Votre avis compte !"}
            </h2>
            <p className={`${currentConfig.subtitleClass} font-semibold text-neutral-600`}>
              {guichet.nom_guichet}
            </p>

            <div style={currentConfig.qrWrapperStyle} className={cadreClasse}>
              <QRCodeSVG value={evalUrl} size={qrPx} level="M" marginSize={1} bgColor={qrBg} fgColor={qrFg} title="QR Code d'évaluation" imageSettings={qrStyle === 'PREMIUM' && qrLogo ? {
            src: qrLogo,
            height: Math.round(qrPx * 0.2),
            width: Math.round(qrPx * 0.2),
            excavate: true,
        } : undefined}/>
            </div>

            <p className={`${currentConfig.scanTextClass} font-bold uppercase tracking-wide text-neutral-900`}>
              {brandConfig?.qr_slogan || "Scannez ce QR Code"}
            </p>
            <p className={`${currentConfig.scanDescClass} font-medium text-neutral-600`}>
              Notez-nous en 10 secondes, après votre passage à ce guichet
            </p>

            <div className={`rounded-xl bg-neutral-100 px-4 ${currentConfig.ussdPaddingClass} print:border print:border-neutral-400 print:bg-white`}>
              <p className="text-xs font-semibold text-neutral-700">
                {brandConfig?.ussd_help_text || "Pas de connexion internet ?"}
              </p>
              <p className="text-sm font-bold tracking-wide text-neutral-900 mt-1">
                Composez <span className="font-bold text-primary">{ussdCode}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center print:hidden pt-2">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button onClick={downloadKit} className="gap-2 rounded-xl shadow-sm px-5 py-5 text-sm font-bold">
            <Download size={16}/> Télécharger l'affiche ({selectedFormat})
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(evalUrl)} className="gap-2 rounded-xl px-5 py-5 text-sm font-semibold">
            <Share2 size={16}/> Copier le lien
          </Button>
        </motion.div>
      </div>
    </div>);
};
//# sourceMappingURL=KitGuichet.jsx.map