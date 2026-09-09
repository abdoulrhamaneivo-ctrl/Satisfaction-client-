import { motion } from 'framer-motion';
import { cn } from '../utils';
export const MotionCard = ({ children, className = '', interactive = true, ...props }) => (<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className={cn('relative rounded-2xl border border-border/70 bg-card shadow-sm transition-colors duration-200', interactive && 'hover:border-border', className)} {...props}>
    {children}
  </motion.div>);
