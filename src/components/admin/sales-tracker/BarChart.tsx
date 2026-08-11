'use client';

export default function BarChart({ pairs }: { pairs: [string, number][] }) {
  const max = Math.max(1, ...pairs.map((p) => p[1]));
  return (
    <>
      {pairs.map(([label, count]) => (
        <div className="bar-row" key={label}>
          <div className="bar-label">{label}</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round((count / max) * 100)}%` }} /></div>
          <div className="bar-count">{count}</div>
        </div>
      ))}
    </>
  );
}
