import type { MarketOverview } from '@/modules/funding-deals/domain/types';
import { emptyCls, PALETTE } from '../ui';

const W = 980;
const H = 440;
const LEFT_X = 140;
const RIGHT_X = 840;
const NODE_W = 10;

/**
 * Market › Overview "Series → Sector flow": SVG port of the preview's renderSankey().
 * Left nodes = round stages, right nodes = sectors (top 7), bands sized by $ raised.
 */
export default function SankeyFlow({ overview }: { overview: MarketOverview }) {
  const { stages, sectors, flows } = overview;
  if (!flows.length) return <div className={emptyCls}>No disclosed amounts in the last 12 months</div>;

  const usable = H - 40;
  const leftTotal = stages.reduce((a, s) => a + s.total, 0) || 1;
  const rightTotal = sectors.reduce((a, s) => a + s.total, 0) || 1;

  const leftPos = new Map<string, { y: number; h: number }>();
  let ly = 20;
  for (const s of stages) {
    const h = Math.max(6, (s.total / leftTotal) * usable);
    leftPos.set(s.key, { y: ly, h });
    ly += h + 8;
  }
  const rightPos = new Map<string, { y: number; h: number }>();
  let ry = 20;
  for (const s of sectors) {
    const h = Math.max(6, (s.total / rightTotal) * usable);
    rightPos.set(s.key, { y: ry, h });
    ry += h + 8;
  }

  const leftOffset = new Map([...leftPos].map(([k, v]) => [k, v.y]));
  const rightOffset = new Map([...rightPos].map(([k, v]) => [k, v.y]));
  const sectorIndex = new Map(sectors.map((s, i) => [s.key, i]));

  const paths = flows
    .filter((f) => leftPos.has(f.from) && rightPos.has(f.to))
    .map((f, i) => {
      const fh = Math.max(1, (f.amount / leftTotal) * usable);
      const th = Math.max(1, (f.amount / rightTotal) * usable);
      const y0 = leftOffset.get(f.from)!;
      leftOffset.set(f.from, y0 + fh);
      const y1 = rightOffset.get(f.to)!;
      rightOffset.set(f.to, y1 + th);
      const x0 = LEFT_X + NODE_W;
      const x1 = RIGHT_X;
      const cx = (x0 + x1) / 2;
      const color = PALETTE[(sectorIndex.get(f.to) ?? 0) % PALETTE.length];
      return (
        <path
          key={`${f.from}-${f.to}-${i}`}
          d={`M${x0},${y0} C${cx},${y0} ${cx},${y1} ${x1},${y1} L${x1},${y1 + th} C${cx},${y1 + th} ${cx},${y0 + fh} ${x0},${y0 + fh} Z`}
          fill={color}
          opacity={0.18}
          className="transition-opacity duration-150 hover:opacity-55 motion-reduce:transition-none"
        >
          <title>{`${f.from} → ${f.to}`}</title>
        </path>
      );
    });

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block min-w-[640px] max-w-full [&:has(path:hover)>path:not(:hover)]:opacity-[0.07]" role="img" aria-label="Capital flow from funding stage to sector">
        {paths}
        {stages.map((s) => {
          const p = leftPos.get(s.key)!;
          return (
            <g key={`l-${s.key}`}>
              <rect x={LEFT_X} y={p.y} width={NODE_W} height={p.h} fill="#8E8E9E" rx={2} />
              <text x={LEFT_X - 10} y={p.y + p.h / 2 + 4} textAnchor="end" fontSize={12} fill="#5A5763">{s.key}</text>
            </g>
          );
        })}
        {sectors.map((s, i) => {
          const p = rightPos.get(s.key)!;
          return (
            <g key={`r-${s.key}`}>
              <rect x={RIGHT_X} y={p.y} width={NODE_W} height={p.h} fill={PALETTE[i % PALETTE.length]} rx={2} />
              <text x={RIGHT_X + NODE_W + 10} y={p.y + p.h / 2 + 4} fontSize={12} fill="#5A5763">{s.key}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
