"use client";

export function StickySidebarContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky-sidebar-wrapper" style={{ height: '100%' }}>
      <div className="sticky-sidebar-content">
        {children}
      </div>
    </div>
  );
}
