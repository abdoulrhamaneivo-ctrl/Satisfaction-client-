import React from 'react';
export declare const DataTable: ({ headers, children, maxHeight, className, }: {
    headers?: string[];
    children: React.ReactNode;
    maxHeight?: string;
    className?: string;
}) => React.JSX.Element;
export declare const DataTableRow: ({ children, onClick, className, }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}) => React.JSX.Element;
