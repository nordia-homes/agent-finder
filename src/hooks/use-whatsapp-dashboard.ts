'use client';

import { useCallback, useEffect, useState } from 'react';

type DashboardState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useWhatsAppDashboard<T>() {
  const [state, setState] = useState<DashboardState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await fetch('/api/whatsapp/dashboard', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load WhatsApp dashboard.');
      }

      setState({
        data: payload as T,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unexpected dashboard error.',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    refresh: load,
  };
}
