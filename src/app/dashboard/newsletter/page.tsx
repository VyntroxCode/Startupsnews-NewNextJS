'use client';

import { useCallback, useEffect, useState } from 'react';
import NewsletterHeader from '@/components/user/newsletter/NewsletterHeader';
import NewsletterCard from '@/components/user/newsletter/NewsletterCard';
import HowItWorksCard from '@/components/user/newsletter/HowItWorksCard';
import UnsubscribeCard from '@/components/user/newsletter/UnsubscribeCard';

interface AuthUser { id: number; name: string; email: string; newsletter_category_slugs?: string; }
interface NLCategory { id: number; name: string; slug: string; color: string; }

// Press Release is not a reader newsletter topic, so it is never offered here.
const isPressRelease = (text: string) => /press[\s_-]*release/i.test(text);

export default function NewsletterPage() {
  const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = useCallback(() => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    fetch('/api/newsletter/categories')
      .then(r => r.json())
      .then(d => {
        if (d.success) setNlCategories((d.data as NLCategory[]).filter(c => !isPressRelease(c.name) && !isPressRelease(c.slug)));
        else setCategoriesError(true);
      })
      .catch(() => setCategoriesError(true))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    loadCategories();

    const token = localStorage.getItem('pub_auth_token');
    if (token) {
      fetch('/api/public-auth/newsletter-preferences', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setSelectedCats((d.data as string[]).filter(slug => !isPressRelease(slug))); })
        .catch(() => {});
    }
  }, [loadCategories]);

  const toggleCat = (slug: string) => {
    setError('');
    setSelectedCats(prev => {
      const isSelected = prev.includes(slug);
      if (isSelected) return prev.filter(s => s !== slug);
      if (prev.length >= 3) return prev;
      return [...prev, slug];
    });
  };

  const handleSave = async () => {
    if (selectedCats.length === 0) { setError('Please select at least 1 category.'); return; }
    setError(''); setSaving(true);
    try {
      const token = localStorage.getItem('pub_auth_token');
      const res = await fetch('/api/public-auth/newsletter-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categories: selectedCats }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Save failed'); return; }
      const raw = localStorage.getItem('pub_auth_user');
      if (raw) {
        const u = JSON.parse(raw) as AuthUser;
        const updated = { ...u, newsletter_category_slugs: selectedCats.join(',') };
        localStorage.setItem('pub_auth_user', JSON.stringify(updated));
        window.dispatchEvent(new Event('pub-auth-changed'));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="box-border min-h-screen bg-slate-50 p-5 sm:p-8">
      <div className="w-full max-w-[1800px]">
        <NewsletterHeader />

        <div className="grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <NewsletterCard
            categories={nlCategories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            onRetryCategories={loadCategories}
            selectedCats={selectedCats}
            onToggleCat={toggleCat}
            onClear={() => setSelectedCats([])}
            onSave={handleSave}
            saving={saving}
            saved={saved}
            error={error}
          />

          <div className="flex flex-col gap-4">
            <HowItWorksCard />
            <UnsubscribeCard />
          </div>
        </div>
      </div>
    </div>
  );
}
