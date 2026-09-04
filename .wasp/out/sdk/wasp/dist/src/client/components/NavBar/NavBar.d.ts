export interface NavigationItem {
    name: string;
    to: string;
    roles?: string[];
    children?: NavigationItem[];
}
export declare function NavBar({ navigationItems, }: {
    navigationItems: NavigationItem[];
}): import("react").JSX.Element;
//# sourceMappingURL=NavBar.d.ts.map