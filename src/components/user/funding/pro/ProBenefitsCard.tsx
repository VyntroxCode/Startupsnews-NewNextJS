import { Activity, BarChart3, ClipboardList, Compass, LineChart, PieChart, Rocket, Search, Sparkles, Telescope, TrendingUp } from 'lucide-react';
import { tagCls } from '../ui';
import { proCard, proEyebrow, proIconTile, proPad, proTitle } from './ui';

/**
 * What the plan covers: the screens of the Funding section, grouped by what a reader does there.
 * Each group has its own colour: `tile` for the item icons, `badge` for the heading icon, `line`
 * for the rule beside the heading and `hover` for an item title under the mouse.
 */
const GROUPS = [
  {
    label: 'Track The Market',
    icon: Activity,
    badge: 'bg-fi-primary text-white',
    line: 'from-fi-primary/50',
    tile: 'bg-fi-primary-light text-fi-primary',
    hover: 'group-hover:text-fi-primary',
    items: [
      { icon: BarChart3, title: 'Live Funding Dashboard', text: 'Total funding, deals, average round, leading sector and most active investor this year.' },
      { icon: TrendingUp, title: 'Funding Over Time', text: 'Week-on-week, month-on-month and year-on-year trends.' },
      { icon: PieChart, title: 'Breakdowns', text: 'Funding split by sector, stage, city and investor.' },
    ],
  },
  {
    label: 'Explore Every Deal',
    icon: Compass,
    badge: 'bg-fi-ai text-white',
    line: 'from-fi-ai/50',
    tile: 'bg-fi-ai-light text-fi-ai',
    hover: 'group-hover:text-fi-ai',
    items: [
      { icon: ClipboardList, title: 'All Deals In One Table', text: 'Filter by sector, stage, city or investor and download as Excel.' },
      { icon: Search, title: 'Deal Search', text: 'Find any startup, investor or round in seconds.' },
      { icon: LineChart, title: 'Market Analysis', text: 'Eight views of the last 12 months, from growth to head-to-head.' },
    ],
  },
  {
    label: 'Look Ahead',
    icon: Rocket,
    badge: 'bg-fi-gold text-white',
    line: 'from-fi-gold/60',
    tile: 'bg-fi-gold-light text-fi-gold-ink',
    hover: 'group-hover:text-fi-gold-ink',
    items: [
      { icon: Telescope, title: '12-Month Outlook', text: 'A forward look at where funding is likely heading.' },
      { icon: Sparkles, title: 'AI Assistant', text: 'Ask funding questions in plain English.', soon: true },
    ],
  },
];

/** Text inside a clipped line, so it can rise into view when its card appears (see motion.ts). */
function Rise({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.14em] align-bottom">
      <span data-pro="rise" className="inline-block">{children}</span>
    </span>
  );
}

/** The large card: everything in the plan. */
export default function ProBenefitsCard() {
  return (
    <section aria-labelledby="pro-benefits-h" data-pro="block" data-pro-delay="0.5" className={`${proCard} ${proPad} relative overflow-hidden`}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-fi-primary to-fi-ai" />
      <div className={proEyebrow}><Rise>What You Get</Rise></div>
      <h2 id="pro-benefits-h" className={`${proTitle} mt-1`}><Rise>Everything In The Pro Plan</Rise></h2>
      <p data-pro="item" className="m-0 mt-1.5 max-w-[56ch] text-[14px] leading-relaxed text-fi-ink-soft">
        One plan, the whole Funding section. Here is what is inside.
      </p>

      {GROUPS.map(({ label, icon: GroupIcon, badge, line, tile, hover, items }) => (
        <div key={label} className="mt-6">
          <h3 className="m-0 flex items-center gap-2.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-fi-ink sm:text-[17px]">
            <span aria-hidden data-pro="pop" className={`flex size-7 shrink-0 items-center justify-center rounded-[9px] ${badge}`}><GroupIcon size={15} /></span>
            <Rise>{label}</Rise>
            {/* Rule beside the heading; it draws out from the text when the card appears. */}
            <span aria-hidden data-pro="grow" className={`h-0.5 flex-1 rounded-full bg-linear-to-r to-transparent ${line}`} />
          </h3>
          <ul className="m-0 mt-2.5 grid list-none gap-x-3 gap-y-1 p-0 sm:grid-cols-2">
            {items.map(({ icon: Icon, title, text, soon }) => (
              <li key={title} data-pro="item" className="group flex items-start gap-3 rounded-[12px] p-2.5 transition-colors duration-200 hover:bg-fi-bg">
                <span aria-hidden className={`${proIconTile} ${tile} transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className={`flex flex-wrap items-center gap-2 text-[14.5px] font-bold leading-snug text-fi-ink transition-colors duration-200 ${hover}`}>
                    {title}
                    {soon && <span className={tagCls}>Coming Soon</span>}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-fi-ink-soft">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
