'use client';

import { useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, Treemap } from 'recharts';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { hlState, useHighlight } from '../highlight';
import { FloatTip, TipRow, pct } from '../parts';
import type { SectorTile } from '../selectors';

interface TileProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
}

/**
 * Every sector as a tile sized by $ raised. The top sectors carry the shared sector colours; the
 * long tail is neutral so the eye goes to where the money is. Hover or tap a tile to light that
 * sector up across the ranking, Sankey and heatmap.
 */
export default function SectorTreemap({ tiles }: { tiles: SectorTile[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const api = useHighlight();
  const [tip, setTip] = useState<{ x: number; y: number; tile: SectorTile } | null>(null);
  const byName = useMemo(() => new Map(tiles.map((t) => [t.name, t])), [tiles]);

  const place = (e: React.MouseEvent, tile: SectorTile) => {
    const box = wrap.current?.getBoundingClientRect();
    if (box) setTip({ x: e.clientX - box.left, y: e.clientY - box.top, tile });
  };

  const renderTile = (p: TileProps) => {
    const { x = 0, y = 0, width = 0, height = 0, depth = 0, name = '' } = p;
    const t = byName.get(name);
    if (depth !== 1 || !t) return <g />;
    const state = hlState(api.hl, 'sector', name);
    const showName = width > 64 && height > 30;
    const showValue = width > 64 && height > 48;
    const light = t.colour === '#C9C5CF';
    return (
      <g
        className="cursor-pointer"
        onMouseEnter={(e) => { api.set({ kind: 'sector', key: name }); place(e, t); }}
        onMouseMove={(e) => place(e, t)}
        onMouseLeave={() => { api.set(null); setTip(null); }}
        onClick={() => api.toggle({ kind: 'sector', key: name })}
      >
        <rect
          x={x + 1}
          y={y + 1}
          width={Math.max(0, width - 2)}
          height={Math.max(0, height - 2)}
          rx={4}
          fill={t.colour}
          fillOpacity={state === 'off' ? 0.25 : light ? 0.55 : 0.92}
          stroke={state === 'on' ? '#15131A' : 'none'}
          strokeWidth={2}
        />
        {showName && (
          <text x={x + 10} y={y + 20} fontSize={12} fontWeight={600} fill={light ? '#15131A' : '#FFFFFF'} fillOpacity={state === 'off' ? 0.5 : 1}>
            {name.length * 7 > width - 16 ? `${name.slice(0, Math.max(3, Math.floor((width - 16) / 7) - 1))}…` : name}
          </text>
        )}
        {showValue && (
          <text x={x + 10} y={y + 37} fontSize={11} fill={light ? '#5A5763' : '#FFFFFF'} fillOpacity={state === 'off' ? 0.45 : 0.85} className="font-(family-name:--font-fi-plex)">
            {formatUsdMn(t.size)}
          </text>
        )}
      </g>
    );
  };

  return (
    <div ref={wrap} className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={tiles} dataKey="size" nameKey="name" aspectRatio={1.6} isAnimationActive={false} content={renderTile} />
      </ResponsiveContainer>
      {tip && (
        <FloatTip x={tip.x} y={tip.y}>
          <div className="mb-1 font-semibold">{tip.tile.name}</div>
          <TipRow label="Funding" value={formatUsdMn(tip.tile.size)} />
          <TipRow label="Deals" value={tip.tile.count.toLocaleString('en-IN')} />
          <TipRow label="Share of capital" value={pct(tip.tile.share, 1)} />
        </FloatTip>
      )}
    </div>
  );
}
