import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import type { EnsTravelEnquiry } from '@/modules/ens-travel-enquiries/domain/types';

export type { SalesLead } from '@/modules/sales-tracker/domain/types';

/** A row in the unified "All leads" table: every sales_leads row, plus every Expand North Star
 * enquiry joined in at the display layer only (ens_travel_enquiries is never written to from
 * here). `_source` is what the table uses to know which shape it's holding — which columns are
 * real for this row (the rest render as "-") and which modal/save-path a click opens. */
export type UnifiedLeadRow =
  | ({ _source: 'lead' } & SalesLead)
  | ({ _source: 'ens' } & EnsTravelEnquiry);

export interface JsPdfDoc {
  setFontSize: (n: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  text: (s: string, x: number, y: number) => void;
  autoTable: (opts: Record<string, unknown>) => void;
  save: (filename: string) => void;
}
