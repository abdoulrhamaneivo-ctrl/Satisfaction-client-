import React from 'react';
import { type OptionForm } from '../criteres/optionsForm';
interface EditeurOptionsProps {
    options: OptionForm[];
    onChange: (options: OptionForm[]) => void;
    /** CASES + mode pondéré : affiche la colonne poids. */
    pondere: boolean;
}
export declare const EditeurOptions: React.FC<EditeurOptionsProps>;
export {};
//# sourceMappingURL=EditeurOptions.d.ts.map