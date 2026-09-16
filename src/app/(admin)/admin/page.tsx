'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminUser, getAuthHeaders, withAdminToken } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import AttendanceWidget from '@/components/admin/AttendanceWidget';
import ProfileProgressStrip from '@/components/admin/ProfileProgressStrip';
import ImageUpload from '@/components/admin/ImageUpload';

interface DashboardStats {
  posts: number;
  events: number;
  categories: number;
  users: number;
  eventRegions: number;
  authors: number;
  /** Partnership Tracker's "All Active events" total — everything except the Expired/Unmapped
   * buckets, the same number its own headline card shows. This is what the Events card reports
   * now; `events` above is the legacy `events` table, which the public site no longer reads. */
  partnershipEventsActive: number;
  /** Tickets not yet resolved/closed — powers the IT Support role's dashboard card. */
  itTicketsOpen: number;
}

export default function AdminDashboard() {
  const role = getAdminUser()?.role || 'admin';
  const isEventAdmin = role === 'event_admin';
  const isPublisherAdmin = role === 'publisher_admin';
  const isItSupport = role === 'it_support';
  // Every standalone-tool panel-admin role (Event Admin, Publisher Admin, IT Support) shares the
  // same scoped dashboard: its own stat card(s), the HR attendance widgets, and none of the
  // content-admin-only sections (Footer Settings, Hero Images) below.
  const isScopedRole = isEventAdmin || isPublisherAdmin || isItSupport;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyrightText, setCopyrightText] = useState('© {{year}} Dotfyi Media Ventures Pvt Ltd');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [heroStep1, setHeroStep1] = useState('');
  const [heroStep2, setHeroStep2] = useState('');
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroMessage, setHeroMessage] = useState<string | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);

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
    if (isScopedRole) {
      setSettingsLoading(false);
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (isScopedRole) {
      setHeroLoading(false);
      return;
    }

    const fetchHeroImages = async () => {
      try {
        const response = await fetch(withAdminToken('/api/admin/site-settings/feature-startup-images'), {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data?.success) {
          setHeroStep1(data.data?.step1 || '');
          setHeroStep2(data.data?.step2 || '');
        }
      } catch (err) {
        console.error('Error fetching feature-startup-images setting:', err);
      } finally {
        setHeroLoading(false);
      }
    };

    fetchHeroImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveHeroImages = async () => {
    setHeroSaving(true);
    setHeroMessage(null);
    setHeroError(null);

    try {
      const response = await fetch('/api/admin/site-settings/feature-startup-images', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ step1: heroStep1, step2: heroStep2 }),
      });
      const data = await response.json();

      if (!data?.success) {
        setHeroError(data?.error || 'Failed to save hero images');
        return;
      }

      setHeroMessage('Feature Your Startup hero images updated successfully.');
    } catch (err) {
      console.error('Error saving feature-startup-images setting:', err);
      setHeroError('An error occurred while saving the hero images');
    } finally {
      setHeroSaving(false);
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

  const TicketIcon = ({ color }: { color: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"></path>
      <line x1="10" y1="7" x2="10" y2="17" strokeDasharray="2 2"></line>
    </svg>
  );

  const AuthorsIcon = ({ color }: { color: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );

  // Globe icon — only user was the retired Event Regions card; kept for an easy restore.
  // const RegionsIcon = ({ color }: { color: string }) => (
  //   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  //     <circle cx="12" cy="12" r="10"></circle>
  //     <line x1="2" y1="12" x2="22" y2="12"></line>
  //     <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  //   </svg>
  // );

  const statCards = isItSupport
    ? [
        {
          title: 'Open IT Tickets',
          value: stats?.itTicketsOpen || 0,
          href: '/admin/it-tickets',
          gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          icon: TicketIcon,
        },
      ]
    : isEventAdmin
    ? [
        {
          title: 'Events',
          value: stats?.partnershipEventsActive || 0,
          href: '/admin/partnership-tracker',
          gradient: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
          icon: EventsIcon,
        },
        // Event Regions card retired along with the Event Regions admin tab — the count came
        // from the legacy `event_regions` table and the card linked to a tab that no longer
        // renders. Partnership Tracker (the Events card above) is the entry point now.
      ]
    : isPublisherAdmin
    ? [
        {
          title: 'Posts',
          value: stats?.posts || 0,
          href: '/admin/posts',
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          icon: PostsIcon,
        },
        {
          title: 'Industry',
          value: stats?.categories || 0,
          href: '/admin/posts?tab=industry',
          gradient: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
          icon: CategoriesIcon,
        },
        {
          title: 'Authors',
          value: stats?.authors || 0,
          href: '/admin/posts?tab=authors',
          gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          icon: AuthorsIcon,
        },
      ]
    : [
        {
          title: 'Posts',
          value: stats?.posts || 0,
          href: '/admin/posts',
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          icon: PostsIcon,
        },
        {
          title: 'Events',
          value: stats?.partnershipEventsActive || 0,
          href: '/admin/partnership-tracker',
          gradient: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
          icon: EventsIcon,
        },
        {
          title: 'Categories',
          value: stats?.categories || 0,
          href: '/admin/posts?tab=industry',
          gradient: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
          icon: CategoriesIcon,
        },
        {
          title: 'Users',
          value: stats?.users || 0,
          href: '/admin/users',
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
            marginTop:'1rem',
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}>
            Dashboard
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            margin: 0,
            marginTop:'1rem',
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

        {isScopedRole && <ProfileProgressStrip />}
        {isScopedRole && <AttendanceWidget />}

        {!isScopedRole && (
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
        )}

        {!isScopedRole && (
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
              Feature Your Startup — Hero Images
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '0.9375rem',
              marginBottom: '1rem',
            }}>
              Replace the two split-screen hero photos on <code>/feature-your-startup</code> with real
              photography, uploaded to the CDN. Leave a field empty to fall back to the page&apos;s
              bundled placeholder image.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <ImageUpload
                label="Step 1 — Your Details & Contact"
                value={heroStep1}
                onChange={setHeroStep1}
              />
              <ImageUpload
                label="Step 2 — Pitch Deck"
                value={heroStep2}
                onChange={setHeroStep2}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={saveHeroImages}
                disabled={heroLoading || heroSaving}
                style={{
                  padding: '0.7rem 1.2rem',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: heroLoading || heroSaving ? 'not-allowed' : 'pointer',
                  opacity: heroLoading || heroSaving ? 0.7 : 1,
                }}
              >
                {heroSaving ? 'Saving...' : 'Save Hero Images'}
              </button>
              {heroMessage && <p style={{ margin: 0, color: '#166534', fontSize: '0.9rem' }}>{heroMessage}</p>}
              {heroError && <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.9rem' }}>{heroError}</p>}
            </div>
          </div>
        )}
      </div>
    </AdminErrorBoundary>
  );
}
