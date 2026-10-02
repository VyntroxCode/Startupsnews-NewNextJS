export default function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 motion-safe:animate-pulse">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
          <div className="h-3 flex-1 rounded-md bg-slate-100" />
          <div className="h-5 w-5 shrink-0 rounded-full bg-slate-100" />
        </div>
      ))}
    </>
  );
}
