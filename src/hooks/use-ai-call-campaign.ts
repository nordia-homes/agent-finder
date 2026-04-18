'use client';

import { useCallback, useEffect, useState } from 'react';

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useAICallCampaign<T>(campaignId: string) {
  const [state, setState] = useState<LoadState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (!campaignId) return;

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await fetch(`/api/ai-calls/campaigns/${campaignId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load AI call campaign.');
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
        error: error instanceof Error ? error.message : 'Unexpected AI call campaign error.',
      });
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    refresh: load,
  };
}
