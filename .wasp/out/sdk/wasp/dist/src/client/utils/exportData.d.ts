export type ExportMeta = {
    entreprise?: string;
    periode?: string;
};
export declare function exportToCSV(data: Record<string, any>[], filename: string, meta?: ExportMeta): void;
type Sheet = {
    name: string;
    data: Record<string, any>[];
};
export declare function exportToXLSX(sheets: Sheet[], filename: string, meta?: ExportMeta): Promise<void>;
export declare function formaterAvisPourCSV(avis: any[]): Record<string, any>[];
export {};
//# sourceMappingURL=exportData.d.ts.map