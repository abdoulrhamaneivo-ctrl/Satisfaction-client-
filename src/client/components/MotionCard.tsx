import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils';

interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  /** Disable the hover lift (useful for static containers). */
  interactive?: boolean;
}

export const MotionCard = ({
  children,
  className = '',
  interactive = true,
  ...props
}: MotionCardProps) => (
  <motion.div
    whileHover={interactive ? { y: -4 } : undefined}
    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    className={cn(
      'relative rounded-2xl border border-border/70 bg-card shadow-premium transition-shadow duration-300',
      interactive && 'hover:shadow-premium-lg',
      className,
    )}
    {...props}
  >
    {children}
  </motion.div>
);
