import React from 'react';
interface SidebarContentProps {
    onNavigate?: () => void;
    className?: string;
}
export declare function SidebarContent({ onNavigate, className }: SidebarContentProps): React.JSX.Element;
export declare function Sidebar(): React.JSX.Element;
interface MobileSidebarDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
export declare function MobileSidebarDrawer({ open, onOpenChange }: MobileSidebarDrawerProps): React.JSX.Element;
export {};
