'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const RichTextEditorClient = dynamic(
  () => import('./RichTextEditorClient'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 200,
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'white',
        }}
      >
        {/* Shimmer toolbar */}
        <div style={{
          padding: '8px 6px',
          background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: 6,
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i < 2 ? 28 : 32,
                height: 24,
                borderRadius: 4,
                background: '#e2e8f0',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
        {/* Editor area */}
        <div style={{ padding: '16px', color: '#94a3b8', fontSize: 14, fontStyle: 'italic' }}>
          Loading editor…
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    ),
  }
);

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 200,
}: RichTextEditorProps) {
  return (
    <RichTextEditorClient
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={minHeight}
    />
  );
}
