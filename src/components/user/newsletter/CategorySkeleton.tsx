export default function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="nl-skeleton-card"
          style={{
            display: 'flex', alignItems: 'center', gap: 11,
            padding: '13px 14px', borderRadius: 13, border: '1.5px solid #f1f5f9',
          }}
        >
          <div className="nl-skeleton-shimmer" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
          <div className="nl-skeleton-shimmer" style={{ height: 12, borderRadius: 6, flex: 1 }} />

          <style jsx>{`
            .nl-skeleton-shimmer {
              background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
              background-size: 200% 100%;
              animation: nl-shimmer 1.4s ease infinite;
            }
            @keyframes nl-shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .nl-skeleton-shimmer { animation: none; background: #f1f5f9; }
            }
          `}</style>
        </div>
      ))}
    </>
  );
}
