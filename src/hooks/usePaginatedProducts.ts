import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchProducts } from '@/api/catalog';
import type { Product, ProductQuery } from '@/types';

type Status = 'loading' | 'ready' | 'error';

/**
 * Chargement progressif : page par page, avec actualisation, reprise après erreur
 * et annulation des requêtes obsolètes quand les filtres changent.
 */
export function usePaginatedProducts(query: ProductQuery) {
  const [items, setItems] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const pageRef = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const queryKey = JSON.stringify(query);
  const queryRef = useRef(query);
  queryRef.current = query;

  const load = useCallback(async (page: number, mode: 'initial' | 'more' | 'refresh') => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    if (mode === 'initial') setStatus('loading');
    if (mode === 'more') setLoadingMore(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);

    try {
      const res = await fetchProducts(queryRef.current, page, controller.signal);
      if (controller.signal.aborted) return;
      pageRef.current = page;
      setItems((prev) => (page === 0 ? res.items : [...prev, ...res.items]));
      setHasMore(res.hasMore);
      setTotal(res.total);
      setStatus('ready');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message || 'Une erreur est survenue.');
      if (mode === 'initial') setStatus('error');
    } finally {
      if (inFlight.current === controller) {
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setHasMore(true);
    load(0, 'initial');
    return () => inFlight.current?.abort();
  }, [queryKey, load]);

  const loadMore = useCallback(() => {
    if (status !== 'ready' || loadingMore || refreshing || !hasMore || error) return;
    load(pageRef.current + 1, 'more');
  }, [status, loadingMore, refreshing, hasMore, error, load]);

  const refresh = useCallback(() => load(0, 'refresh'), [load]);
  const retry = useCallback(
    () => (items.length ? load(pageRef.current + 1, 'more') : load(0, 'initial')),
    [items.length, load],
  );

  return { items, status, error, loadingMore, refreshing, hasMore, total, loadMore, refresh, retry };
}
