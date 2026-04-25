/**
 * CSV export utilities
 */

export function escapeCsvField(field: string | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field).trim();
  // Escape quotes and wrap field in quotes if it contains special characters
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function convertToCsv<T extends Record<string, any>>(
  data: T[],
  columns: (keyof T)[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Header row
  const header = columns.map(col => escapeCsvField(String(col))).join(',');

  // Data rows
  const rows = data.map(row =>
    columns.map(col => escapeCsvField(row[col] as string)).join(',')
  );

  return [header, ...rows].join('\n');
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function fetchAndDownloadCsv(
  endpoint: string,
  filename: string,
  headers?: Record<string, string> | HeadersInit
): Promise<void> {
  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    downloadCsv(csvContent, filename);
  } catch (error) {
    console.error('CSV export error:', error);
    throw error;
  }
}
