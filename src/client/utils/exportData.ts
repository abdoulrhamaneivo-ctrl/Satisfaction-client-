// src/client/utils/exportData.ts
// Export CSV natif (sans dépendance) + XLSX multi-feuilles via SheetJS.
// Le CSV utilise le point-virgule comme séparateur (compatible Excel FR/RDC).

// ============================================================================
// CSV natif — pas de dépendance npm requise
// ============================================================================

function escapeCSVCell(value: any): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => escapeCSVCell(row[h])).join(';'));
  const csvContent = [headers.join(';'), ...rows].join('\n');

  // BOM UTF-8 pour que Excel s'ouvre correctement sans problème d'encodage
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// XLSX multi-feuilles via SheetJS (Community Edition)
// Chaque feuille est définie par { name, data } où `data` est un tableau
// de rows (objet plat — pas de cellules imbriquées).
// ============================================================================

type Sheet = { name: string; data: Record<string, any>[] };

export async function exportToXLSX(sheets: Sheet[], filename: string): Promise<void> {
  // Import dynamique pour ne pas alourdir le bundle principal
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    if (!sheet.data || sheet.data.length === 0) {
      // Feuille vide : on en crée une avec juste l'en-tête "Aucune donnée"
      const ws = XLSX.utils.aoa_to_sheet([['Aucune donnée disponible']]);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
      continue;
    }

    // Formatage des dates lisibles
    const formatted = sheet.data.map((row) => {
      const out: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        const val = row[key];
        if (val instanceof Date) {
          out[key] = val.toLocaleString('fr-FR');
        } else if (typeof val === 'bigint') {
          out[key] = val.toString();
        } else {
          out[key] = val;
        }
      }
      return out;
    });

    const ws = XLSX.utils.json_to_sheet(formatted);
    // Largeur automatique des colonnes (approximation)
    const headers = Object.keys(formatted[0]);
    ws['!cols'] = headers.map((h) => ({
      wch: Math.min(
        50,
        Math.max(h.length + 2, ...formatted.map((r) => String(r[h] ?? '').length))
      ),
    }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ============================================================================
// Helper : formater une liste d'avis pour le CSV AvisPage
// ============================================================================

export function formaterAvisPourCSV(avis: any[]): Record<string, any>[] {
  return avis.map((a) => ({
    'Date': new Date(a.date_reponse).toLocaleString('fr-FR'),
    'Agence': a.agence || '',
    'Guichet': a.guichet || '',
    'Service': a.service || '',
    'Agent': a.agent || '',
    'Note moyenne': a.score_moyen,
    'Commentaire': a.commentaire || '',
    'Détail critères': a.criteres || '',
    'ID Soumission': a.id_soumission || '',
  }));
}
