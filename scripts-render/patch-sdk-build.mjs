#!/usr/bin/env node
// patch-sdk-build.mjs — free tier Render (512MB) ne peut pas compiler le SDK
// TypeScript (OOM à ~400MB heap). Ce script remplace le script "build" du
// SDK généré par un no-op : le dist PRÉCOMPILÉ (prebuilt-sdk/dist, committé
// depuis une machine avec RAM suffisante) est restauré ensuite par cp.
import fs from 'node:fs';
const pkgPath = '.wasp/out/sdk/wasp/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (!pkg.scripts.build?.includes('tsc')) {
  console.log('[patch-sdk] build script déjà sans tsc — rien à faire');
  process.exit(0);
}
pkg.scripts.build = 'node ./scripts/copy-assets.js';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('[patch-sdk] build du SDK remplacé (tsc désactivé — dist précompilé utilisé)');
