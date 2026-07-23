'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, TrendingUp, Phone, MapPin, CheckCircle } from 'lucide-react';

interface LeadMetrics {
  callbacksRequested: number;
  siteVisitsScheduled: number;
  visitConversionRate: number;
  avgLeadScore: number;
  hotLeadsCount: number;
}

export default function LeadsDashboard() {
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/v1/leads/metrics');
      if (res.ok) {
        setMetrics(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!metrics) return <div className="p-8 text-center text-red-600">Failed to load metrics</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Lead Funnel</h1>

        {/* Funnel visualization */}
        <div className="space-y-6 mb-8">
          {[
            { label: 'Callbacks Requested', value: metrics.callbacksRequested, icon: Phone, color: 'blue' },
            { label: 'Site Visits Scheduled', value: metrics.siteVisitsScheduled, icon: MapPin, color: 'purple' },
            { label: 'Conversion Rate', value: `${metrics.visitConversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'green' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/30`}>
                <item.icon className={`w-6 h-6 text-${item.color}-600 dark:text-${item.color}-400`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
              </div>
              {i < 2 && <ArrowRight className="w-5 h-5 text-slate-400" />}
            </div>
          ))}
        </div>

        {/* Lead quality metrics */}
        <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">Avg Lead Score</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.avgLeadScore.toFixed(0)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">out of 100</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">HOT Leads</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.hotLeadsCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">score ≥ 70</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Next Steps</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Follow up with HOT leads within 24 hours</li>
            <li>• Target 50%+ callback-to-visit conversion</li>
            <li>• Builders prefer qualified leads (score ≥ 70)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
