'use client';

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function LoadingSkeleton({ rows = 5, columns = 5 }: LoadingSkeletonProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid rgba(0, 0, 0, 0.04)',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            }}>
              {Array.from({ length: columns }).map((_, i) => (
                <th
                  key={i}
                  style={{
                    padding: '1.25rem 1.5rem',
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div style={{
                    height: '16px',
                    background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: '4px',
                    width: i === 0 ? '60%' : i === columns - 1 ? '40%' : '80%',
                  }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  borderBottom: rowIndex < rows - 1 ? '1px solid rgba(0, 0, 0, 0.04)' : 'none',
                }}
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{
                      height: '20px',
                      background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px',
                      width: colIndex === 0 ? '70%' : colIndex === columns - 1 ? '50%' : '90%',
                      animationDelay: `${rowIndex * 0.1}s`,
                    }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}

