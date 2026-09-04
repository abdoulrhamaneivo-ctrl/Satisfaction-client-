import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../utils';
// Blobs verts + jaunes qui flottent lentement en arrière-plan.
// Chaque blob est un grand cercle flou (blur-3xl) animé en boucle douce.
// Opacités volontairement faibles : le fond anime la page sans jamais
// concurrencer le contenu (cartes, tableaux, formulaires) au premier plan.
const BLOBS = [
    { className: 'top-[-12%] left-[-8%] size-[38rem] bg-brand-green/8', duration: 28, delay: 0, x: [0, 90, -50, 0], y: [0, -70, 50, 0] },
    { className: 'top-[10%] right-[-10%] size-[30rem] bg-warning/8', duration: 32, delay: 4, x: [0, -80, 45, 0], y: [0, 55, -45, 0] },
    { className: 'bottom-[-14%] left-[12%] size-[34rem] bg-brand-green-deep/6', duration: 36, delay: 8, x: [0, 70, -55, 0], y: [0, -45, 35, 0] },
    { className: 'top-[42%] left-[36%] size-[24rem] bg-warning/5', duration: 30, delay: 12, x: [0, -55, 35, 0], y: [0, 45, -35, 0] },
];
export const AnimatedBackground = ({ className }) => {
    const reduce = useReducedMotion();
    return (<div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {BLOBS.map((blob, i) => (<motion.div key={i} className={cn('absolute rounded-full blur-3xl', blob.className)} animate={reduce ? undefined : { x: blob.x, y: blob.y, scale: [1, 1.08, 0.96, 1] }} transition={reduce ? undefined : { duration: blob.duration, repeat: Infinity, ease: 'easeInOut', delay: blob.delay }}/>))}
    </div>);
};
//# sourceMappingURL=AnimatedBackground.jsx.map