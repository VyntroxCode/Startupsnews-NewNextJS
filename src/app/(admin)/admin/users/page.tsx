'use client';

import { useCallback, useState } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';
import { useAdminData } from '@/hooks/useAdminData';
import Pagination from '@/components/admin/Pagination';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSkeleton from '@/components/admin/LoadingSkeleton';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

type Tab = 'users' | 'panel-admins';

const TABS: { key: Tab; label: string }[] = [
  { key: 'users', label: 'Admin Users' },
  { key: 'panel-admins', label: 'Panel Admins' },
];

interface AccountRow {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

interface FormState {
  id: number | null;
  email: string;
  name: string;
  password: string;
  role: string;
  isActive: boolean;
}

interface AccountManagerProps {
  apiBase: string;
  entityLabel: string;
  subtitle: string;
  roleOptions: string[];
  roleLabels: Record<string, string>;
  defaultRole: string;
  deleteConfirmMessage: string;
}

function AccountManager({
  apiBase,
  entityLabel,
  subtitle,
  roleOptions,
  roleLabels,
  defaultRole,
  deleteConfirmMessage,
}: AccountManagerProps) {
  const emptyForm: FormState = {
    id: null,
    email: '',
    name: '',
    password: '',
    role: defaultRole,
    isActive: true,
  };

  const {
    data: accounts,
    loading,
    error,
    refetch,
    pagination,
    search,
    setSearch,
    setPage,
    setLimit,
  } = useAdminData<AccountRow>({
    endpoint: `${apiBase}?full=1`,
    limit: 20,
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let generated = '';
    const randomValues = new Uint32Array(14);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
    } else {
      for (let i = 0; i < randomValues.length; i++) randomValues[i] = Math.floor(Math.random() * 4294967296);
    }
    for (let i = 0; i < randomValues.length; i++) {
      generated += chars[randomValues[i] % chars.length];
    }
    setForm((prev) => ({ ...prev, password: generated }));
    setShowPassword(true);
  }, []);

  const openCreate = useCallback(() => {
    setForm(emptyForm);
    setFormError('');
    setShowPassword(false);
    setShowModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRole]);

  const openEdit = useCallback((account: AccountRow) => {
    setShowPassword(false);
    setForm({
      id: account.id,
      email: account.email,
      name: account.name,
      password: '',
      role: account.role,
      isActive: account.isActive,
    });
    setFormError('');
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    if (saving) return;
    setShowModal(false);
  }, [saving]);

  const notifyDataUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:data-updated'));
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.email.trim() || !form.name.trim()) {
      setFormError('Email and name are required');
      return;
    }
    if (!form.id && !form.password.trim()) {
      setFormError('Password is required for new accounts');
      return;
    }

    setSaving(true);
    try {
      const isEdit = form.id !== null;
      const url = isEdit ? `${apiBase}/${form.id}` : apiBase;
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        email: form.email.trim(),
        name: form.name.trim(),
        role: form.role,
      };
      if (isEdit) {
        body.isActive = form.isActive;
      }
      if (form.password.trim()) {
        body.password = form.password.trim();
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setFormError(data.error || `Failed to save (${response.status})`);
        return;
      }

      setShowModal(false);
      notifyDataUpdated();
      await refetch();
    } catch (err) {
      console.error('Error saving account:', err);
      setFormError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  }, [form, refetch, apiBase]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm(deleteConfirmMessage)) {
      return;
    }
    try {
      const response = await fetch(`${apiBase}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.error || `Failed to delete (${response.status})`);
        return;
      }
      notifyDataUpdated();
      await refetch();
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('An error occurred while deleting');
    }
  }, [refetch, apiBase, deleteConfirmMessage]);

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
          {subtitle}
        </p>
        <button
          type="button"
          onClick={openCreate}
          style={{
            padding: '0.875rem 1.75rem',
            background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            fontSize: '0.9375rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(237, 137, 54, 0.3)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add {entityLabel}
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email..." />
      </div>

      {error && (
        <div style={{
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          color: '#991b1b',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          border: '1px solid #fca5a5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}>
          <span>{error}</span>
          <button type="button" onClick={() => refetch()} style={{ padding: '0.5rem 1rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}>Retry</button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={10} columns={5} />
      ) : accounts.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          padding: '4rem 2rem',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        }}>
          <h3 style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No {entityLabel.toLowerCase()}s found</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Add your first {entityLabel.toLowerCase()}.</p>
        </div>
      ) : (
        <>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Name</th>
                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Email</th>
                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Role</th>
                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Status</th>
                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account, index) => (
                    <tr
                      key={account.id}
                      style={{ borderBottom: index < accounts.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: '#0f172a' }}>{account.name}</td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>{account.email}</td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>{roleLabels[account.role] || account.role}</td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: account.isActive ? '#dcfce7' : '#f1f5f9',
                          color: account.isActive ? '#166534' : '#64748b',
                        }}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => openEdit(account)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(account.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div style={{ marginTop: '1.5rem' }}>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                total={pagination.total}
                limit={pagination.limit}
                onLimitChange={setLimit}
              />
            </div>
          )}
        </>
      )}

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.375rem', fontWeight: '700', marginBottom: '1.5rem', color: '#0f172a' }}>
              {form.id ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
            </h3>

            {formError && (
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.375rem' }}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.375rem' }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.375rem' }}>
                  Password {form.id && <span style={{ color: '#94a3b8', fontWeight: '400' }}>(leave blank to keep current)</span>}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder={form.id ? '••••••••' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      padding: '0 0.875rem',
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{
                      padding: '0 0.875rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Generate
                  </button>
                </div>
                {showPassword && form.password && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                    Copy this password now — it won&apos;t be shown again after saving.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.375rem' }}>Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={inputStyle}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
                </select>
              </div>

              {form.id && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <label htmlFor="isActive" style={{ fontSize: '0.875rem', color: '#334155' }}>Active</label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : form.id ? 'Save Changes' : `Create ${entityLabel}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <AdminErrorBoundary>
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Users
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '0.875rem 1.25rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #ed8936' : '2px solid transparent',
                color: activeTab === tab.key ? '#0f172a' : '#64748b',
                fontWeight: activeTab === tab.key ? '700' : '600',
                fontSize: '0.9375rem',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' ? (
          <AccountManager
            key="users"
            apiBase="/api/admin/users"
            entityLabel="User"
            subtitle="Manage Admin, Editor, and Author login accounts"
            roleOptions={['admin', 'editor', 'author']}
            roleLabels={{ admin: 'Admin', editor: 'Editor', author: 'Author' }}
            defaultRole="author"
            deleteConfirmMessage="Are you sure you want to delete this admin account? This cannot be undone."
          />
        ) : (
          <AccountManager
            key="panel-admins"
            apiBase="/api/admin/panel-admins"
            entityLabel="Panel Admin"
            subtitle="Manage Event Admin (Events section) and Publisher Admin (Content section) accounts"
            roleOptions={['event_admin', 'publisher_admin']}
            roleLabels={{ event_admin: 'Event Admin', publisher_admin: 'Publisher Admin' }}
            defaultRole="event_admin"
            deleteConfirmMessage="Are you sure you want to delete this panel admin account? This cannot be undone."
          />
        )}
      </div>
    </AdminErrorBoundary>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '0.9375rem',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
};
