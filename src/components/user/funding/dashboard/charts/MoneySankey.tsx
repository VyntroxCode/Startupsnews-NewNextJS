'use client';

import { useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, Sankey } from 'recharts';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { useHighlight, type Highlight } from '../highlight';
import { FloatTip, TipRow, pct } from '../parts';
import type { FlowData, FlowLink, FlowNode } from '../selectors';

/* Recharts passes these to custom node/link renderers (see recharts/types/chart/Sankey.d.ts). */
interface NodeArgs {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: { name: string; depth: number };
}
interface LinkArgs {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
  payload: { source: { name: string }; target: { name: string } };
}

const cellKey = (stage: string, sector: string) => `${stage}\u0000${sector}`;

function linkOpacity(l: FlowLink, hl: Highlight, hovered: boolean): number {
  if (hovered) return 0.72;
  if (!hl) return 0.26;
  const match = hl.kind === 'sector' ? l.sector === hl.key : l.stage === hl.key;
  return match ? 0.6 : 0.06;
}

function nodeOpacity(n: FlowNode, hl: Highlight, flow: FlowData): number {
  if (!hl) return 1;
  if (n.kind === hl.kind) return n.name === hl.key ? 1 : 0.25;
  // The other side: keep the nodes connected to the highlighted one.
  const connected = flow.links.some((l) => (hl.kind === 'sector' ? l.sector === hl.key && l.stage === n.name : l.stage === hl.key && l.sector === n.name));
  return connected ? 1 : 0.25;
}

/**
 * Round stage → sector: where each stage's money went. Band width = $ raised; every deal has exactly
 * one stage and one sector, so the bands add up to the total. Stages and sectors outside the top 8
 * are folded into "Other" by the API rather than dropped.
 */
export default function MoneySankey({ flow }: { flow: FlowData }) {
  const wrap = useRef<HTMLDivElement>(null);
  const api = useHighlight();
  const [tip, setTip] = useState<{ x: number; y: number; link?: FlowLink; node?: FlowNode } | null>(null);

  const linkByCell = useMemo(() => new Map(flow.links.map((l) => [cellKey(l.stage, l.sector), l])), [flow]);
  const nodeByKey = useMemo(() => new Map(flow.nodes.map((n) => [`${n.kind}\u0000${n.name}`, n])), [flow]);
  const data = useMemo(() => ({ nodes: flow.nodes.map((n) => ({ name: n.name })), links: flow.links.map((l) => ({ source: l.source, target: l.target, value: l.value })) }), [flow]);

  const at = (e: React.MouseEvent) => {
    const box = wrap.current?.getBoundingClientRect();
    return box ? { x: e.clientX - box.left, y: e.clientY - box.top } : { x: 0, y: 0 };
  };

  const renderLink = (p: LinkArgs) => {
    const l = linkByCell.get(cellKey(p.payload.source.name, p.payload.target.name));
    if (!l) return <path />;
    const hovered = tip?.link === l;
    const d = `M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`;
    const colour = nodeByKey.get(`sector\u0000${l.sector}`)?.colour ?? '#C9C5CF';
    return (
      <path
        d={d}
        fill="none"
        stroke={colour}
        strokeWidth={Math.max(1, p.linkWidth)}
        strokeOpacity={linkOpacity(l, api.hl, hovered)}
        className="cursor-pointer transition-[stroke-opacity] duration-200 motion-reduce:transition-none"
        onMouseEnter={(e) => { api.set({ kind: 'sector', key: l.sector }); setTip({ ...at(e), link: l }); }}
        onMouseMove={(e) => setTip({ ...at(e), link: l })}
        onMouseLeave={() => { api.set(null); setTip(null); }}
        onClick={() => api.toggle({ kind: 'sector', key: l.sector })}
      />
    );
  };

  const renderNode = (p: NodeArgs) => {
    const kind = p.payload.depth === 0 ? 'stage' : 'sector';
    const n = nodeByKey.get(`${kind}\u0000${p.payload.name}`);
    if (!n) return <rect />;
    const left = kind === 'stage';
    const tx = left ? p.x - 10 : p.x + p.width + 10;
    const anchor = left ? 'end' : 'start';
    const mid = p.y + p.height / 2;
    const twoLines = p.height >= 26;
    const op = nodeOpacity(n, api.hl, flow);
    return (
      <g
        className="cursor-pointer"
        opacity={op}
        onMouseEnter={(e) => { api.set({ kind, key: n.name }); setTip({ ...at(e), node: n }); }}
        onMouseMove={(e) => setTip({ ...at(e), node: n })}
        onMouseLeave={() => { api.set(null); setTip(null); }}
        onClick={() => api.toggle({ kind, key: n.name })}
      >
        <rect x={p.x} y={p.y} width={p.width} height={Math.max(2, p.height)} rx={2} fill={n.colour} />
        {twoLines ? (
          <>
            <text x={tx} y={mid - 2} textAnchor={anchor} fontSize={12} fontWeight={600} fill="#15131A">{n.name}</text>
            <text x={tx} y={mid + 12} textAnchor={anchor} fontSize={10.5} fill="#9C99A6">{formatUsdMn(n.total)}</text>
          </>
        ) : (
          <text x={tx} y={mid + 4} textAnchor={anchor} fontSize={11} fill="#15131A">
            <tspan fontWeight={600}>{n.name}</tspan>
            <tspan fill="#9C99A6">{`  ${formatUsdMn(n.total)}`}</tspan>
          </text>
        )}
      </g>
    );
  };

  return (
    <div ref={wrap} className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          node={renderNode as never}
          link={renderLink as never}
          nodePadding={16}
          nodeWidth={10}
          linkCurvature={0.48}
          sort={false}
          margin={{ top: 8, right: 150, bottom: 8, left: 120 }}
        />
      </ResponsiveContainer>
      {tip?.link && (
        <FloatTip x={tip.x} y={tip.y}>
          <div className="mb-1 font-semibold">{tip.link.stage} <span className="text-fi-ink-faint">→</span> {tip.link.sector}</div>
          <TipRow label="Funding" value={formatUsdMn(tip.link.value)} />
          <TipRow label="Deals" value={tip.link.count.toLocaleString('en-IN')} />
          <TipRow label={`Share Of ${tip.link.stage}`} value={pct(tip.link.shareOfStage)} />
        </FloatTip>
      )}
      {tip?.node && (
        <FloatTip x={tip.x} y={tip.y}>
          <div className="mb-1 font-semibold">{tip.node.name}</div>
          <TipRow label="Funding" value={formatUsdMn(tip.node.total)} />
          <TipRow label="Deals" value={tip.node.count.toLocaleString('en-IN')} />
        </FloatTip>
      )}
    </div>
  );
}
