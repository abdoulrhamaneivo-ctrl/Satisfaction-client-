import React from 'react';
interface FormFieldProps {
    label: string;
    htmlFor?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    className?: string;
    children: React.ReactNode;
}
/**
 * Consistent label + control + hint/error wrapper for premium forms.
 * Pairs with shadcn Input / Select / Textarea controls.
 */
export declare const FormField: ({ label, htmlFor, hint, error, required, className, children, }: FormFieldProps) => React.JSX.Element;
export {};
//# sourceMappingURL=FormField.d.ts.map