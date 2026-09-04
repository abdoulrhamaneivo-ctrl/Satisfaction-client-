export declare function exportToCSV(data: Record<string, any>[], filename: string): void;
type Sheet = {
    name: string;
    data: Record<string, any>[];
};
export declare function exportToXLSX(sheets: Sheet[], filename: string): Promise<void>;
export declare function formaterAvisPourCSV(avis: any[]): Record<string, any>[];
export {};
//# sourceMappingURL=exportData.d.ts.map