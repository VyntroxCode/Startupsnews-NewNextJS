import { tagCls } from './ui';

const ITEMS = [
  { sym: 'NIFTY 50', val: '24,812', up: true, chg: '+0.8%' },
  { sym: 'SENSEX', val: '81,442', up: true, chg: '+0.6%' },
  { sym: 'NASDAQ', val: '19,204', up: false, chg: '-0.3%' },
  { sym: 'S&P 500', val: '5,948', up: true, chg: '+0.4%' },
  { sym: 'BTC', val: '$94,120', up: true, chg: '+2.1%' },
  { sym: 'USD/INR', val: '83.42', up: false, chg: '-0.1%' },
  { sym: 'India VC Index', val: '112.4', up: true, chg: '+1.5%' },
  { sym: 'Global AI Funding', val: '$14.2B', up: true, chg: '+3.2% WoW' },
];

/**
 * Preview .ticker-wrap ("Market pulse"). A live ticker needs a licensed market-data feed, so these
 * are sample values — marked SAMPLE on the strip so no reader takes them as live prices.
 */
export default function Ticker() {
  const run = (copy: number) =>
    ITEMS.map((i) => (
      <span key={`${copy}-${i.sym}`} className="shrink-0 font-(family-name:--font-fi-plex) text-[12px] text-white">
        <span className="font-semibold text-white/85">{i.sym}</span> {i.val}{' '}
        <span className={i.up ? 'text-[#4ADE80]' : 'text-[#F87171]'}>{i.up ? '▲' : '▼'} {i.chg}</span>
      </span>
    ));
  return (
    <div className="group relative mt-3 overflow-hidden rounded-xl bg-fi-ink py-2.5">
      <div className="absolute left-3.5 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 bg-fi-ink pr-2.5 text-[9.5px] font-bold tracking-[0.04em] text-white/50">
        MARKET PULSE <span className={`${tagCls} px-1.5 py-px text-[8.5px]`}>SAMPLE</span>
      </div>
      <div className="flex w-max animate-fi-ticker gap-7 whitespace-nowrap pl-[190px] group-hover:[animation-play-state:paused]" aria-hidden>
        {run(1)}
        {run(2)}
      </div>
      <span className="sr-only">Sample market values, not live data.</span>
    </div>
  );
}
