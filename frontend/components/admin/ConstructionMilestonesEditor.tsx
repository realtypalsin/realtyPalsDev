'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { adminAuthHeaders } from '@/lib/authedFetch';
import { API_BASE } from '@/lib/env';

export interface MilestoneItem {
  id?: string;
  name: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  date_label: string;
  sort_order: number;
}

interface ConstructionMilestonesEditorProps {
  projectId: string;
}

const DEFAULT_PHASES: MilestoneItem[] = [
  { name: 'Excavation & Substructure', status: 'completed', date_label: 'Q1 2024', sort_order: 1 },
  { name: 'Tower Structure (RCC Frame)', status: 'completed', date_label: 'Q4 2024', sort_order: 2 },
  { name: 'Brickwork & Internal Plaster', status: 'in_progress', date_label: 'Q2 2025', sort_order: 3 },
  { name: 'MEP, Plumbing & Electrical', status: 'in_progress', date_label: 'Q4 2025', sort_order: 4 },
  { name: 'Facade, Windows & Painting', status: 'upcoming', date_label: 'Q2 2026', sort_order: 5 },
  { name: 'Finishing, Lift & Handover', status: 'upcoming', date_label: 'Q4 2026', sort_order: 6 },
];

export default function ConstructionMilestonesEditor({ projectId }: ConstructionMilestonesEditorProps) {
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/admin/projects/${projectId}/milestones`, {
        headers: adminAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.milestones) && data.milestones.length > 0) {
          setMilestones(data.milestones);
        } else {
          setMilestones(DEFAULT_PHASES);
        }
      } else {
        setMilestones(DEFAULT_PHASES);
      }
    } catch {
      setMilestones(DEFAULT_PHASES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchMilestones();
  }, [projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/v1/admin/projects/${projectId}/milestones`, {
        method: 'PUT',
        headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ milestones }),
      });

      if (!res.ok) throw new Error('Failed to save construction milestones');
      toast.success('Construction milestones updated successfully!');
      await fetchMilestones();
    } catch (err: any) {
      toast.error(err?.message || 'Error saving milestones');
    } finally {
      setSaving(false);
    }
  };

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        name: 'New Construction Phase',
        status: 'upcoming',
        date_label: 'Q1 2027',
        sort_order: prev.length + 1,
      },
    ]);
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, key: keyof MilestoneItem, value: any) => {
    setMilestones((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center gap-2 text-gray-500">
        <RefreshCw size={16} className="animate-spin text-blue-600" />
        <span>Loading construction milestones…</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Construction & Development Timeline
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Manage site velocity phases & RERA completion dates for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addMilestone}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Add Phase
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving…' : 'Save Milestones'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {milestones.map((m, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 space-y-3 relative group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Phase {idx + 1}
              </span>
              <button
                onClick={() => removeMilestone(idx)}
                className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                title="Remove Phase"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                Phase Name
              </label>
              <input
                type="text"
                value={m.name}
                onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                className="w-full text-xs font-bold bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={m.status}
                  onChange={(e) => updateMilestone(idx, 'status', e.target.value as any)}
                  className="w-full text-xs font-semibold bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                >
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Date / Quarter
                </label>
                <input
                  type="text"
                  value={m.date_label || ''}
                  placeholder="e.g. Q4 2025"
                  onChange={(e) => updateMilestone(idx, 'date_label', e.target.value)}
                  className="w-full text-xs font-semibold bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
