import React from 'react';
import { Label } from './ui/label';
import { cn } from '../utils';
/**
 * Consistent label + control + hint/error wrapper for premium forms.
 * Pairs with shadcn Input / Select / Textarea controls.
 */
export const FormField = ({ label, htmlFor, hint, error, required, className, children, }) => {
    return (<div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-foreground">
        {label}
        {required && <span className="ml-0.5 text-secondary">*</span>}
      </Label>
      {children}
      {error ? (<p className="text-xs font-medium text-destructive">{error}</p>) : hint ? (<p className="text-xs text-muted-foreground">{hint}</p>) : null}
    </div>);
};
//# sourceMappingURL=FormField.jsx.map