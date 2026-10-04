import { emptyCls } from '../ui';

/** .canvas-wrap (270px) / .canvas-wrap.tall (320px) on desktop, a little shorter on phones, with the preview's empty note. */
export default function ChartBox({
  tall,
  empty,
  emptyText = 'No data for current filters',
  boxRef,
  height,
  children,
}: {
  tall?: boolean;
  /** Fixed pixel height (overrides the responsive defaults) — e.g. bars sized by row count. */
  height?: number;
  empty?: boolean;
  emptyText?: string;
  boxRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const size = height ? '' : tall ? 'h-[280px] sm:h-[320px]' : 'h-[240px] sm:h-[270px]';
  return (
    <div ref={boxRef} className={`relative w-full min-w-0 ${size}`} style={height ? { height } : undefined}>
      {empty ? <div className={emptyCls}>{emptyText}</div> : children}
    </div>
  );
}
