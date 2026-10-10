import localFont from 'next/font/local';

// The funding pages use one typeface everywhere: Calibri. Calibri is a Microsoft font that cannot be
// self-hosted, so devices that have it installed (Windows, Office on Mac) use it directly and every
// other device gets Carlito, the open-source font drawn to Calibri's exact metrics.
// Carlito ships regular and bold only (as Calibri does), so 500 renders regular and 600 renders bold.
export const fiFont = localFont({
  src: [
    { path: '../../../fonts/carlito-latin-400.woff2', weight: '400' },
    { path: '../../../fonts/carlito-latin-700.woff2', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-fi-carlito',
});

/**
 * Put on a wrapper to set the funding font for everything inside it. Shared by the funding layout
 * and the Market Pulse ticker, which renders in the dashboard masthead, outside that layout.
 * - font-size-adjust: Calibri's letters are smaller than Inter's at the same px size; this keeps the
 *   small labels (11-12px) as readable as before.
 * - The [&_button] etc. rules: form controls do not inherit the font and this dashboard has no Preflight.
 */
export const fiFontCls = `${fiFont.variable} font-[family-name:Calibri,var(--font-fi-carlito),Arial,sans-serif] [font-size-adjust:0.52] [&_button]:font-[family-name:inherit] [&_input]:font-[family-name:inherit] [&_select]:font-[family-name:inherit] [&_textarea]:font-[family-name:inherit]`;
