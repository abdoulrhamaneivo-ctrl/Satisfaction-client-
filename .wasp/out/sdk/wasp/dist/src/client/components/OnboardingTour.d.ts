import React from 'react';
export type TourStep = {
    targetSelector?: string;
    title: string;
    description: string;
    badge?: string;
    position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
};
export declare function OnboardingTour(): React.JSX.Element | null;
export declare function TriggerOnboardingButton(): React.JSX.Element;
//# sourceMappingURL=OnboardingTour.d.ts.map