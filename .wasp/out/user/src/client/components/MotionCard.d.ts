import { type HTMLMotionProps } from 'framer-motion';
interface MotionCardProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    className?: string;
    /** Active un léger surlignage de bordure au survol (pas de lévitation). */
    interactive?: boolean;
}
export declare const MotionCard: ({ children, className, interactive, ...props }: MotionCardProps) => import("react").JSX.Element;
export {};
