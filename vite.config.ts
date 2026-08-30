import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { wasp } from 'wasp/client/vite'

// Config Vite canonique Wasp 0.24 (starter basic) + plugin Tailwind v4.
// Wasp exige ce fichier à la racine. host:true = écoute IPv4 + IPv6
// (corrige les connexions refusées sur localhost/[::1] selon le resolveur).
// Les polices sont 100% locales (head.wasp.ts + @font-face Main.css) :
// plus aucun lien fontshare/Google = plus de NS_ERROR_NET_TIMEOUT/écran blanc.
export default defineConfig({
  plugins: [wasp(), tailwindcss()],
  server: {
    host: true,
  },
})
