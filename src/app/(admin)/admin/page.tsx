'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHeaders, withAdminToken } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

interface DashboardStats {
  posts: number;
  events: number;
  categories: number;
  users: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyrightText, setCopyrightText] = useState('© {{year}} Dotfyi Media Ventures Pvt Ltd');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Single batch API call instead of 3 separate calls
        const response = await fetch(withAdminToken('/api/admin/stats'), {
          headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to fetch stats');
          return;
        }

        setStats(data.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('An error occurred while fetching dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(withAdminToken('/api/admin/site-settings/footer-copyright'), {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data?.success && typeof data?.data?.value === 'string') {
          setCopyrightText(data.data.value);
        }
      } catch (err) {
        console.error('Error fetching footer setting:', err);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveFooterSetting = async () => {
    setSavingSettings(true);
    setSettingsMessage(null);
    setSettingsError(null);

    try {
      const response = await fetch('/api/admin/site-settings/footer-copyright', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ value: copyrightText }),
      });
      const data = await response.json();

      if (!data?.success) {
        setSettingsError(data?.error || 'Failed to save footer copyright text');
        return;
      }

      setSettingsMessage('Footer copyright text updated successfully.');
    } catch (err) {
      console.error('Error saving footer setting:', err);
      setSettingsError('An error occurred while saving footer copyright text');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '4rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Loading dashboard...</p>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        color: '#991b1b',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #fca5a5',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
          <strong>Error loading dashboard</strong>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  const DashboardIcon = ({ color }: { color: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"></rect>
      <rect x="14" y="3" width="7" height="7" rx="1"></rect>
      <rect x="14" y="14" width="7" height="7" rx="1"></rect>
      <rect x="3" y="14" width="7" height="7" rx="1"></rect>
    </svg>
  );

  const PostsIcon = ({ color }: { color: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  );

  const EventsIcon = ({ color }: { color: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );

  const CategoriesIcon = ({ color }: { color: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h16M4 17h16"></path>
    </svg>
  );

  const statCards = [
    {
      title: 'Posts',
      value: stats?.posts || 0,
      href: '/admin/posts',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: PostsIcon,
    },
    {
      title: 'Events',
      value: stats?.events || 0,
      href: '/admin/events',
      gradient: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
      icon: EventsIcon,
    },
    {
      title: 'Categories',
      value: stats?.categories || 0,
      href: '/admin/categories',
      gradient: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
      icon: CategoriesIcon,
    },
    {
      title: 'Users',
      value: stats?.users || 0,
      href: '#',
      gradient: 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)',
      icon: DashboardIcon,
    },
  ];

  return (
    <AdminErrorBoundary>
      <div>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}>
            Dashboard
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            margin: 0,
          }}>
            Overview of your content and statistics
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}>
          {statCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  padding: '1.75rem',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'block',
                  border: '1px solid rgba(0, 0, 0, 0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: card.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}>
                    <IconComponent color="white" />
                  </div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: card.gradient,
                    opacity: 0.3,
                  }} />
                </div>
                <h3 style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  margin: '0 0 0.75rem 0',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {card.title}
                </h3>
                <p style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  margin: 0,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: '1',
                }}>
                  {card.value.toLocaleString()}
                </p>
              </Link>
            );
          })}
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#0f172a',
            letterSpacing: '-0.01em',
          }}>
            Quick Actions
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '0.9375rem',
            marginBottom: '1.5rem',
          }}>
            Create new content or manage existing items
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <Link
              href="/admin/posts/create"
              style={{
                padding: '0.875rem 1.75rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Post
            </Link>
            <Link
              href="/admin/events/create"
              style={{
                padding: '0.875rem 1.75rem',
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(72, 187, 120, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(72, 187, 120, 0.3)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Event
            </Link>
            <Link
              href="/admin/categories/create"
              style={{
                padding: '0.875rem 1.75rem',
                background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(237, 137, 54, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(237, 137, 54, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(237, 137, 54, 0.3)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Category
            </Link>
            <Link
              href="/admin/rss-feeds/create"
              style={{
                padding: '0.875rem 1.75rem',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.3)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 11a9 9 0 0 1 9 9"></path>
                <path d="M4 4a16 16 0 0 1 16 16"></path>
                <circle cx="5" cy="19" r="1"></circle>
              </svg>
              Add RSS Feed
            </Link>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          marginTop: '1.5rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#0f172a',
            letterSpacing: '-0.01em',
          }}>
            Footer Settings
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '0.9375rem',
            marginBottom: '1rem',
          }}>
            Update the copyright text shown at the bottom of the website footer. Use <strong>{'{{year}}'}</strong> for automatic current year.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label htmlFor="footer-copyright-text" style={{ fontWeight: 600, color: '#334155' }}>
              Footer Copyright Text
            </label>
            <textarea
              id="footer-copyright-text"
              value={copyrightText}
              onChange={(e) => setCopyrightText(e.target.value)}
              disabled={settingsLoading || savingSettings}
              rows={3}
              maxLength={500}
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              placeholder="© {{year}} Dotfyi Media Ventures Pvt Ltd"
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{copyrightText.length}/500</span>
              <button
                type="button"
                onClick={saveFooterSetting}
                disabled={settingsLoading || savingSettings}
                style={{
                  padding: '0.7rem 1.2rem',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: settingsLoading || savingSettings ? 'not-allowed' : 'pointer',
                  opacity: settingsLoading || savingSettings ? 0.7 : 1,
                }}
              >
                {savingSettings ? 'Saving...' : 'Save Footer Text'}
              </button>
            </div>
            {settingsMessage && <p style={{ margin: 0, color: '#166534', fontSize: '0.9rem' }}>{settingsMessage}</p>}
            {settingsError && <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.9rem' }}>{settingsError}</p>}
          </div>
        </div>
      </div>
    </AdminErrorBoundary>
  );
}
