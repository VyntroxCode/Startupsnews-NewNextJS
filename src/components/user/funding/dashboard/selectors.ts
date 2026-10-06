/**
 * Pure builders that turn the live /api/funding/overview response into chart-ready shapes.
 * Nothing here holds data of its own: every label and number comes from the response.
 * The only constants are colours (the funding PALETTE) and the "Other" bucket name the API uses.
 */

import type { AggRow, FundingKpis, FundingOverview, StageSectorMatrix } from '@/modules/funding-deals/domain/types';
import { PALETTE } from '../ui';

/** Neutral for "Other" and for sectors outside the coloured top group. */
export const NEUTRAL = '#C9C5CF';
export const INK = '#15131A';
export const PINK = '#E01552';
const COLOURED_SECTORS = 8;

/** Sector → colour, by $ rank, so every chart paints a sector the same way. */
export function sectorColours(bySector: AggRow[]): Map<string, string> {
  const map = new Map<string, string>();
  bySector.forEach((s, i) => map.set(s.key, i < COLOURED_SECTORS ? PALETTE[i % PALETTE.length] : NEUTRAL));
  map.set('Other', NEUTRAL);
  return map;
}

/** % change, or null when there is no base to compare with. */
export function deltaPct(cur: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

export interface YoY {
  funding: number | null;
  deals: number | null;
  avg: number | null;
}

export function yoy(kpis: FundingKpis, prev: FundingKpis | null): YoY {
  if (!prev || prev.totalDeals === 0) return { funding: null, deals: null, avg: null };
  return {
    funding: deltaPct(kpis.totalFunding, prev.totalFunding),
    deals: deltaPct(kpis.totalDeals, prev.totalDeals),
    avg: deltaPct(kpis.avgRound, prev.avgRound),
  };
}

/** Share of capital held by the top `n` sectors (0–100). */
export function concentration(bySector: AggRow[], total: number, n = 3): number | null {
  if (!total || !bySector.length) return null;
  return (bySector.slice(0, n).reduce((a, s) => a + s.total, 0) / total) * 100;
}

export interface SectorTile {
  name: string;
  size: number;
  count: number;
  share: number;
  colour: string;
  [key: string]: string | number;
}

export function sectorTiles(bySector: AggRow[], total: number, colours: Map<string, string>): SectorTile[] {
  return bySector
    .filter((s) => s.total > 0)
    .map((s) => ({ name: s.key, size: s.total, count: s.count, share: total ? (s.total / total) * 100 : 0, colour: colours.get(s.key) ?? NEUTRAL }));
}

// ── Sankey (round stage → sector) ──

export interface FlowNode {
  name: string;
  kind: 'stage' | 'sector';
  total: number;
  count: number;
  colour: string;
}

export interface FlowLink {
  source: number;
  target: number;
  value: number;
  stage: string;
  sector: string;
  count: number;
  /** % of the stage's capital that went to this sector. */
  shareOfStage: number;
}

export interface FlowData {
  nodes: FlowNode[];
  links: FlowLink[];
}

/** Stage nodes first (in matrix order), then sector nodes; one link per non-empty cell. */
export function sankeyData(matrix: StageSectorMatrix, colours: Map<string, string>): FlowData {
  const stageTotals = new Map<string, { total: number; count: number }>();
  const sectorTotals = new Map<string, { total: number; count: number }>();
  for (const c of matrix.cells) {
    const st = stageTotals.get(c.stage) ?? { total: 0, count: 0 };
    st.total += c.total;
    st.count += c.count;
    stageTotals.set(c.stage, st);
    const se = sectorTotals.get(c.sector) ?? { total: 0, count: 0 };
    se.total += c.total;
    se.count += c.count;
    sectorTotals.set(c.sector, se);
  }
  const stages = matrix.stages.filter((s) => (stageTotals.get(s)?.total ?? 0) > 0);
  const sectors = matrix.sectors.filter((s) => (sectorTotals.get(s)?.total ?? 0) > 0);
  const nodes: FlowNode[] = [
    ...stages.map((s) => ({ name: s, kind: 'stage' as const, ...stageTotals.get(s)!, colour: INK })),
    ...sectors.map((s) => ({ name: s, kind: 'sector' as const, ...sectorTotals.get(s)!, colour: colours.get(s) ?? NEUTRAL })),
  ];
  const stageIdx = new Map(stages.map((s, i) => [s, i]));
  const sectorIdx = new Map(sectors.map((s, i) => [s, stages.length + i]));
  const links: FlowLink[] = matrix.cells
    .filter((c) => c.total > 0 && stageIdx.has(c.stage) && sectorIdx.has(c.sector))
    .map((c) => ({
      source: stageIdx.get(c.stage)!,
      target: sectorIdx.get(c.sector)!,
      value: c.total,
      stage: c.stage,
      sector: c.sector,
      count: c.count,
      shareOfStage: ((c.total / (stageTotals.get(c.stage)?.total || 1)) * 100),
    }));
  return { nodes, links };
}

// ── Heatmap (sector rows × stage columns) ──

export interface HeatCell {
  total: number;
  count: number;
  /** 0–1, relative to the largest cell. */
  intensity: number;
}

export interface HeatGrid {
  sectors: string[];
  stages: string[];
  cell: (sector: string, stage: string) => HeatCell | null;
  /** Per sector, its top stages by $ (mobile list). */
  topStages: (sector: string, n: number) => { stage: string; total: number; count: number }[];
}

export function heatGrid(matrix: StageSectorMatrix): HeatGrid {
  const max = Math.max(1, ...matrix.cells.map((c) => c.total));
  const map = new Map(matrix.cells.map((c) => [`${c.sector}\u0000${c.stage}`, c]));
  return {
    sectors: matrix.sectors,
    stages: matrix.stages,
    cell: (sector, stage) => {
      const c = map.get(`${sector}\u0000${stage}`);
      return c ? { total: c.total, count: c.count, intensity: c.total / max } : null;
    },
    topStages: (sector, n) =>
      matrix.cells
        .filter((c) => c.sector === sector)
        .sort((a, b) => b.total - a.total)
        .slice(0, n)
        .map((c) => ({ stage: c.stage, total: c.total, count: c.count })),
  };
}

// ── City bubble ──

export interface CityPoint {
  city: string;
  deals: number;
  avg: number;
  total: number;
  [key: string]: string | number;
}

export function cityPoints(byCity: AggRow[]): CityPoint[] {
  return byCity
    .filter((c) => c.count > 0)
    .map((c) => ({ city: c.key, deals: c.count, avg: Math.round((c.total / c.count) * 10) / 10, total: c.total }));
}

/** Everything the page needs, derived once per response. */
export function buildDashboard(o: FundingOverview) {
  const colours = sectorColours(o.bySector);
  const total = o.kpis.totalFunding;
  return {
    colours,
    yoy: yoy(o.kpis, o.previousKpis),
    concentration: concentration(o.bySector, total),
    tiles: sectorTiles(o.bySector, total, colours),
    flow: sankeyData(o.stageSector, colours),
    heat: heatGrid(o.stageSector),
    cities: cityPoints(o.byCity),
  };
}

export type DashboardModel = ReturnType<typeof buildDashboard>;
