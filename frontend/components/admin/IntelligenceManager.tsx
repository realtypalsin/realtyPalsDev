'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Download, Upload } from 'lucide-react';

interface IntelligenceStatus {
  total_projects: number;
  with_intelligence: number;
  coverage_percent: number;
  incomplete_count: number;
  by_status: Record<string, number>;
}

export default function IntelligenceManager() {
  const [status, setStatus] = useState<IntelligenceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSector, setSelectedSector] = useState('');
  const [sectors] = useState(['75', '76', '77', '78', '79', '10', '12']);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/intelligence/status/summary');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBatch = async () => {
    if (!selectedSector) return;
    setGenerating(true);

    try {
      const res = await fetch('/api/admin/intelligence/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: `Sector ${selectedSector}` })
      });

      const data = await res.json();
      console.log('Generated:', data);
      
      // Refresh status
      fetchStatus();
      setSelectedSector('');
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading intelligence status...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-6">Intelligence Data Manager</h2>

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Projects</div>
            <div className="text-2xl font-bold text-blue-600">{status?.total_projects}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">With Intelligence</div>
            <div className="text-2xl font-bold text-green-600">{status?.with_intelligence}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Coverage</div>
            <div className="text-2xl font-bold text-purple-600">{status?.coverage_percent}%</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Incomplete</div>
            <div className="text-2xl font-bold text-orange-600">{status?.incomplete_count}</div>
          </div>
        </div>

        {/* Status by Type */}
        {status?.by_status && (
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Status Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(status.by_status).map(([st, count]) => (
                <div key={st} className="flex justify-between text-sm">
                  <span>{st}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Generation */}
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <RefreshCw size={18} />
            Generate Intelligence by Sector
          </h3>

          <div className="flex gap-3">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select Sector</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  Sector {s}
                </option>
              ))}
            </select>

            <button
              onClick={generateBatch}
              disabled={!selectedSector || generating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>

            <button
              onClick={fetchStatus}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Incomplete Projects */}
        {status && status.incomplete_count > 0 && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-orange-600">
              <AlertCircle size={18} />
              Incomplete Intelligence ({status.incomplete_count})
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Projects missing one or more intelligence fields
            </p>
            <div className="text-xs text-gray-600">
              <p>Generate for entire sector to fill gaps</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="border-t pt-6 mt-6 bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
          <p className="flex gap-2">
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Intelligence includes: Financial, Market, Builder, Property, Comparative Analysis, and Resources
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
