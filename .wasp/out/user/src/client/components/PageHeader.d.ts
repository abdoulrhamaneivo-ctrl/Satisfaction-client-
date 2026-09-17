import React from 'react';
import { type LucideIcon } from 'lucide-react';
interface PageHeaderProps {
    /** Small uppercase eyebrow above the title. */
    eyebrow?: string;
    title: string;
    description?: string;
    icon?: LucideIcon;
    /** Right-aligned actions (buttons, etc.). */
    actions?: React.ReactNode;
    className?: string;
}
export declare const PageHeader: ({ eyebrow, title, description, icon: Icon, actions, className, }: PageHeaderProps) => React.JSX.Element;
export {};
