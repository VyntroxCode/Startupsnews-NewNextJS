/**
 * Shared Tailwind class literals for the reader Funding pages — the funding-platform preview's
 * design, 1:1, via the fi-* theme tokens in isolated-tailwind.css. Literal strings so the scoped
 * sheet (@source "../components/user/funding") picks them up. No Preflight here, so padded
 * full-width controls carry `box-border`.
 */

/** .chart-card / .kpi-card / .table-card surface */
export const cardCls = 'rounded-[14px] border border-solid border-fi-line bg-fi-surface shadow-fi';

/** select / input */
export const inputCls =
  'box-border w-full rounded-lg border border-solid border-fi-line bg-fi-bg px-2.5 py-2 text-[13px] text-fi-ink placeholder:text-fi-ink-faint focus:border-fi-primary focus:outline-2 focus:outline-fi-primary-light';

/** .f-group label */
export const labelCls = 'mb-1 block text-[11.5px] font-semibold tracking-[0.01em] text-fi-ink';

/** .section-head */
export const sectionHead = 'mb-3.5 mt-[30px] flex flex-wrap items-baseline justify-between gap-3';
export const sectionTitle = 'm-0 text-[18px] font-bold tracking-[-0.01em] text-fi-ink';
export const sectionSub = 'text-[12.5px] text-fi-ink-faint';

/** .toggle-row / .toggle-btn (also .subtab-row, .mini-seg) */
export const segWrap = 'flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-[9px] border border-solid border-fi-line bg-fi-bg p-[3px]';
export const segBtn = (active: boolean) =>
  `cursor-pointer whitespace-nowrap rounded-md border-0 px-3.5 py-1.5 text-[12.5px] font-semibold ${active ? 'bg-fi-surface text-fi-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'bg-transparent text-fi-ink-soft'}`;

/** .btn / .btn-sm / .btn-ghost */
export const btnCls =
  'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-solid border-fi-line bg-fi-surface px-2.5 py-1.5 text-[12px] font-semibold text-fi-ink hover:border-fi-ink-faint disabled:cursor-not-allowed disabled:opacity-50';
export const btnGhost =
  'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-solid border-transparent bg-transparent px-2.5 py-1.5 text-[12px] font-semibold text-fi-ink-soft hover:bg-fi-bg';

/** .pill */
export const pillCls = 'inline-block whitespace-nowrap rounded-[20px] bg-fi-primary-light px-[9px] py-0.5 text-[11px] font-semibold text-fi-primary-dark';

/** .preview-tag (gold) — used for "SAMPLE" / "COMING SOON" markers */
export const tagCls = 'inline-flex items-center gap-[5px] rounded-[20px] border border-solid border-fi-gold-line bg-fi-gold-light px-[9px] py-[3px] text-[10px] font-bold tracking-[0.03em] text-fi-gold-ink';

/** .needs-backend note */
export const noteCls = 'my-2.5 flex items-start gap-2 rounded-[10px] border border-solid border-fi-gold-line bg-[#FFF8ED] px-3 py-2.5 text-[11.5px] leading-[1.55] text-fi-gold-ink';

/** .empty-note */
export const emptyCls = 'py-10 text-center text-[12px] text-fi-ink-faint';

/** table head / cell (.table-card table) */
export const thCls = 'whitespace-nowrap border-0 border-b border-solid border-fi-line bg-fi-bg px-3.5 py-2.5 text-left text-[12px] font-bold tracking-[0.01em] text-fi-ink';
export const tdCls = 'border-0 border-b border-solid border-fi-line px-3.5 py-2.5 align-top';

/** The preview's 10-colour categorical palette (bar lists, sankey, marimekko). Hex for charts. */
export const PALETTE = ['#E01552', '#D98E2B', '#5B4FE0', '#0E9D57', '#2E9BD6', '#C74AAE', '#7A5AF8', '#E8664A', '#3AA6A0', '#B23A55'];

/** Round-size bands, smallest → largest cheque (Round Sizes chart and its key). */
export const BAND_PALETTE = ['#5B4FE0', '#2E9BD6', '#0E9D57', '#D98E2B', '#E01552'];

/** PALETTE as Tailwind background classes (bar-list fills), same order. */
export const PALETTE_BG = ['bg-[#E01552]', 'bg-[#D98E2B]', 'bg-[#5B4FE0]', 'bg-[#0E9D57]', 'bg-[#2E9BD6]', 'bg-[#C74AAE]', 'bg-[#7A5AF8]', 'bg-[#E8664A]', 'bg-[#3AA6A0]', 'bg-[#B23A55]'];
