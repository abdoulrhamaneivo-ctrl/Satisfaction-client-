import type { ReactNode, ComponentType } from 'react';
import type { RouteObject } from 'react-router';
type RouteMapping = Record<string, {
    Component: ComponentType;
}>;
export declare function getRouteObjects({ routesMapping, rootElement, }: {
    routesMapping: RouteMapping;
    rootElement: ReactNode;
}): RouteObject[];
export {};
//# sourceMappingURL=router.d.ts.map