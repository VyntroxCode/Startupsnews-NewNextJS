'use client';

import { useCallback, useEffect, useState } from 'react';
import NewsletterHeader from '@/components/user/newsletter/NewsletterHeader';
import NewsletterCard from '@/components/user/newsletter/NewsletterCard';
import HowItWorksCard from '@/components/user/newsletter/HowItWorksCard';
import UnsubscribeCard from '@/components/user/newsletter/UnsubscribeCard';

interface NLCategory { id: number; name: string; slug: string; color: string; }

export default function NewsletterPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [stackRail, setStackRail] = useState(false);
  const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsMobile(window.innerWidth < 640);
      setStackRail(window.innerWidth < 900);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const loadCategories = useCallback(() => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    fetch('/api/newsletter/categories')
      .then(r => r.json())
      .then(d => {
        if (d.success) setNlCategories(d.data);
        else setCategoriesError(true);
      })
      .catch(() => setCategoriesError(true))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <div style={{ padding: isMobile ? '1.25rem' : '2rem', minHeight: '100vh', background: '#f8fafc', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 1800 }}>
        <NewsletterHeader isMobile={isMobile} />

        <div style={{ display: 'grid', gridTemplateColumns: stackRail ? '1fr' : '1fr 320px', gap: isMobile ? '1.25rem' : '1.5rem', alignItems: 'start' }}>

          <NewsletterCard
            isMobile={isMobile}
            categories={nlCategories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            onRetryCategories={loadCategories}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <HowItWorksCard />
            <UnsubscribeCard />
          </div>

        </div>
      </div>
    </div>
  );
}
