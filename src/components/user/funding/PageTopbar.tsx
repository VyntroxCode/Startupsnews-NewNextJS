/** The preview's .topbar: page title + subtitle. */
export default function PageTopbar({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-0 border-b border-solid border-fi-line pb-3.5 sm:gap-4">
      <div className="min-w-0">
        <h1 className="m-0 font-(family-name:--font-fi-space) text-[16px] font-bold sm:text-[18px] tracking-[-0.01em] text-fi-ink">{title}</h1>
        <p className="m-0 mt-0.5 text-[11.5px] text-fi-ink-faint">{sub}</p>
      </div>
      {right}
    </div>
  );
}
