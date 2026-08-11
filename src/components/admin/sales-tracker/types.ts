export type { SalesLead } from '@/modules/sales-tracker/domain/types';

export interface JsPdfDoc {
  setFontSize: (n: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  text: (s: string, x: number, y: number) => void;
  autoTable: (opts: Record<string, unknown>) => void;
  save: (filename: string) => void;
}
