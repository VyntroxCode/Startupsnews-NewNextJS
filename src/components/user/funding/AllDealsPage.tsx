'use client';

import { useEffect, useRef, useState } from 'react';
import type { FundingFilterOptions } from '@/modules/funding-deals/domain/types';
import { downloadWithHeaders } from '@/modules/funding-deals/utils/download';
import { emptyFilters, fundingGet, readerAuthHeaders, toQuery } from './api';
import DealsTable, { type ReaderDeal } from './DealsTable';
import FilterBar, { type ReaderFilters } from './FilterBar';
import PageTopbar from './PageTopbar';

/** /dashboard/funding/deals — preview "All Deals": own filter bar + paged table + .xlsx download. */
export default function AllDealsPage() {
  const [filters, setFilters] = useState<ReaderFilters>(() => emptyFilters());
  const [applied, setApplied] = useState<ReaderFilters>(filters);
  const [options, setOptions] = useState<FundingFilterOptions>({ sectors: [], stages: [], cities: [], countries: [], leadInvestors: [] });
  const [deals, setDeals] = useState<ReaderDeal[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fundingGet('/api/funding/filters').then((j) => setOptions(j.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const typing = filters.search !== applied.search;
    const t = setTimeout(() => { setApplied(filters); setPage(1); }, typing ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to edits
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    fundingGet(`/api/funding/deals?${toQuery({ ...applied, page })}`)
      .then((j) => {
        if (cancelled) return;
        setDeals(j.data);
        setTotal(j.pagination.total);
        setTotalPages(j.pagination.totalPages);
        setError(null);
      })
      .catch((e: Error) => { if (!cancelled) { setDeals([]); setError(e.message); } });
    return () => { cancelled = true; };
  }, [applied, page]);

  const download = async () => {
    setDownloading(true);
    const err = await downloadWithHeaders(`/api/funding/export?${toQuery({ ...applied })}`, readerAuthHeaders(), 'funding-deals.xlsx');
    setDownloading(false);
    if (err) setError(err);
  };

  return (
    <div ref={top}>
      <PageTopbar title="All Deals" sub="Current calendar year by default · tabular view" />
      <div className="pt-[22px]">
        <FilterBar
          filters={filters}
          options={options}
          onChange={(p) => setFilters((f) => ({ ...f, ...p }))}
          onReset={() => setFilters(emptyFilters())}
          fields={['search', 'sector', 'stage', 'city', 'country', 'leadInvestor', 'from', 'to']}
        />
        {error && <p className="m-0 mt-4 rounded-[10px] border border-solid border-[#F5C2C9] bg-fi-red-light px-3 py-2.5 text-[12.5px] text-fi-red">{error}</p>}
        <DealsTable
          deals={deals}
          total={total}
          page={page}
          totalPages={totalPages}
          onPage={(p) => { setPage(p); top.current?.scrollIntoView({ behavior: 'smooth' }); }}
          onDownload={download}
          downloading={downloading}
        />
      </div>
    </div>
  );
}
