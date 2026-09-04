import React from 'react';
import { type BrandConfigType } from '../../shared/branding';
type BrandContextType = {
    brandConfig: BrandConfigType;
    isLoading: boolean;
};
export declare const useBrand: () => BrandContextType;
export declare const BrandProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export {};
