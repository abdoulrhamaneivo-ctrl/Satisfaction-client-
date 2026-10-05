import React from 'react';
export type FiltresAvisProps = {
    idSuffix: string;
    className?: string;
    isDirection: boolean;
    agences?: any[];
    guichets?: any[];
    services?: any[];
    selectedAgenceId: number | undefined;
    setSelectedAgenceId: (v: number | undefined) => void;
    selectedGuichetId: number | undefined;
    setSelectedGuichetId: (v: number | undefined) => void;
    selectedServiceId: number | undefined;
    setSelectedServiceId: (v: number | undefined) => void;
    selectedScore: number | undefined;
    setSelectedScore: (v: number | undefined) => void;
    selectedTheme: string | undefined;
    setSelectedTheme: (v: string | undefined) => void;
    startDate: string;
    setStartDate: (v: string) => void;
    endDate: string;
    setEndDate: (v: string) => void;
};
export declare function FiltresAvis({ idSuffix, className, isDirection, agences, guichets, services, selectedAgenceId, setSelectedAgenceId, selectedGuichetId, setSelectedGuichetId, selectedServiceId, setSelectedServiceId, selectedScore, setSelectedScore, selectedTheme, setSelectedTheme, startDate, setStartDate, endDate, setEndDate, }: FiltresAvisProps): React.JSX.Element;
export declare const AvisPage: () => React.JSX.Element;
//# sourceMappingURL=AvisPage.d.ts.map