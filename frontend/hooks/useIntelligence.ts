'use client';

import { useEffect, useState } from 'react';

interface IntelligenceData {
  id: string;
  status: string;
  decision_thesis?: string;
  financial_intelligence?: Record<string, any>;
  market_intelligence?: Record<string, any>;
  builder_intelligence?: Record<string, any>;
  property_intelligence?: Record<string, any>;
  comparative_analysis?: Record<string, any>;
  resources_documents?: Record<string, any>;
  confidence_sources?: string[];
  last_verified_at?: string;
}

export function useIntelligence(projectId: string | null) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchIntelligence = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/intelligence/${projectId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setData(null);
            return;
          }
          throw new Error('Failed to fetch intelligence');
        }
        const intel = await res.json();
        setData(intel);
      } catch (err) {
        setError((err as Error).message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchIntelligence();
  }, [projectId]);

  return { data, loading, error };
}
