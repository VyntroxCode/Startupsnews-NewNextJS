import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';

const ADMIN_DATA_UPDATED_EVENT = 'admin:data-updated';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: string;
}

export interface UseAdminDataOptions {
  endpoint: string;
  limit?: number;
  enabled?: boolean;
  disableCache?: boolean;
  onSuccess?: <T>(data: T[]) => void;
  onError?: (error: string) => void;
}

export interface UseAdminDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  pagination: PaginationMeta | null;
  search: string;
  filters: Record<string, string | number | boolean | null>;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setFilters: (
    filters: Record<string, string | number | boolean | null> |
      ((prev: Record<string, string | number | boolean | null>) => Record<string, string | number | boolean | null>)
  ) => void;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown[]; timestamp: number; meta?: PaginationMeta }>();
const CACHE_DURATION = 30000; // 30 seconds
const REQUEST_TIMEOUT_MS = 35000; // 35s production - allow for network + DB latency
const REQUEST_TIMEOUT_LOCALHOST_MS = 45000; // 45s localhost - allow cold DB / Redis to connect

function clearCacheForEndpoint(endpoint: string): void {
  const endpointBase = endpoint.split('?')[0];
  for (const key of cache.keys()) {
    if (key.includes(endpointBase)) {
      cache.delete(key);
    }
  }
}

function clearAllAdminApiCache(): void {
  for (const key of cache.keys()) {
    if (key.includes('/api/admin/')) {
      cache.delete(key);
    }
  }
}

function getRequestTimeoutMs(): number {
  if (typeof window === 'undefined') return REQUEST_TIMEOUT_MS;
  const host = window.location?.hostname || '';
  return host === 'localhost' || host === '127.0.0.1' ? REQUEST_TIMEOUT_LOCALHOST_MS : REQUEST_TIMEOUT_MS;
}

export function useAdminData<T = unknown>({
  endpoint,
  limit = 20,
  enabled = true,
  disableCache = false,
  onSuccess,
  onError,
}: UseAdminDataOptions): UseAdminDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(limit);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string | number | boolean | null>>({});
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortedByTimeoutRef = useRef(false);

  const buildUrl = useCallback(() => {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('limit', currentLimit.toString());

    if (search) {
      url.searchParams.set('search', search);
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, value.toString());
      }
    });

    return url.toString();
  }, [endpoint, page, currentLimit, search, filters]);

  // Clear cache when filters change (but not on every render)
  const prevFiltersRef = useRef<{ search: string; filters: Record<string, string | number | boolean | null> }>({ search: '', filters: {} });

  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.search !== search ||
      JSON.stringify(prevFiltersRef.current.filters) !== JSON.stringify(filters);

    if (filtersChanged) {
      // Clear all cache entries for this endpoint
      clearCacheForEndpoint(endpoint);
      prevFiltersRef.current = { search, filters };
    }
  }, [search, filters, endpoint]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const cacheKey = buildUrl();

    // Request timeout so we don't hang forever (longer on localhost for cold DB/Redis)
    const timeoutMs = getRequestTimeoutMs();
    const timeoutId = setTimeout(() => {
      abortedByTimeoutRef.current = true;
      controller.abort();
    }, timeoutMs);

    // Check cache
    const cached = disableCache ? null : cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data as T[]);
      if (cached.meta) setPagination(cached.meta);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Primary request: standard auth headers.
      let response = await fetch(cacheKey, {
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      // Retry 1: cookie-only request (no custom headers). Helps when intermediaries/WAF reject auth headers.
      if (response.status === 401 || response.status === 403) {
        response = await fetch(cacheKey, { signal: controller.signal });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        if (status === 401) {
          throw new Error('Session expired or not logged in. Please log in again.');
        }
        if (status === 403) {
          throw new Error('You do not have permission to view this.');
        }
        throw new Error(`Request failed (${status}). Try again or log in again.`);
      }

      const result: ApiResponse<T[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data || []);
      setPagination(result.meta || null);

      if (!disableCache && result.meta) {
        // Cache with metadata
        cache.set(cacheKey, {
          data: result.data || [],
          timestamp: Date.now(),
          meta: result.meta,
        });
      } else if (!disableCache) {
        // Cache without metadata
        cache.set(cacheKey, {
          data: result.data || [],
          timestamp: Date.now(),
        });
      }

      onSuccess?.(result.data);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        // Only show timeout message when the abort was due to actual timeout, not a newer request
        if (abortedByTimeoutRef.current) {
          abortedByTimeoutRef.current = false;
          setError('Request timed out. Check your connection and try again.');
          onError?.('Request timed out.');
        }
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching data';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [enabled, buildUrl, onSuccess, onError, disableCache]);

  // Debounced search: only reset to page 1 when search term changes (do not depend on fetchData or page changes)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1); // Reset to first page on search; main fetch effect will run when page updates
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  // Single effect: fetch when page, limit, filters, or fetchData (which depends on enabled/buildUrl) change
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, page, currentLimit, filters, fetchData]);

  // Global refresh: any successful admin write operation triggers a refetch
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleAdminDataUpdated = () => {
      clearAllAdminApiCache();
      fetchData();
    };

    window.addEventListener(ADMIN_DATA_UPDATED_EVENT, handleAdminDataUpdated);
    return () => {
      window.removeEventListener(ADMIN_DATA_UPDATED_EVENT, handleAdminDataUpdated);
    };
  }, [enabled, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const refetch = useCallback(async () => {
    // Clear cache for this endpoint
    clearCacheForEndpoint(endpoint);
    await fetchData();
  }, [endpoint, fetchData]);

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSetLimit = useCallback((newLimit: number) => {
    setCurrentLimit(newLimit);
    setPage(1);
  }, []);

  const handleSetFilters = useCallback((
    newFiltersOrUpdater: Record<string, string | number | boolean | null> |
      ((prev: Record<string, string | number | boolean | null>) => Record<string, string | number | boolean | null>)
  ) => {
    setFilters(newFiltersOrUpdater);
    setPage(1);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    pagination,
    search,
    filters,
    setPage: handleSetPage,
    setLimit: handleSetLimit,
    setSearch,
    setFilters: handleSetFilters,
  };
}

