'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw, CheckCircle2, Clock, Calendar, Eye, Activity, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { adminAuthHeaders } from '@/lib/authedFetch';
import { API_BASE } from '@/lib/env';
import CustomSelect from './CustomSelect';

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
  { name: 'RERA & Land Excavation', status: 'completed', date_label: 'Q1 2024', sort_order: 1 },
  { name: 'Tower Raft & Basement Foundation', status: 'completed', date_label: 'Q3 2024', sort_order: 2 },
  { name: 'Superstructure Slabs & RCC Frame', status: 'in_progress', date_label: 'Q1 2025', sort_order: 3 },
  { name: 'Brickwork & Internal Plastering', status: 'in_progress', date_label: 'Q3 2025', sort_order: 4 },
  { name: 'Exterior Elevation & Tile Flooring', status: 'upcoming', date_label: 'Q1 2026', sort_order: 5 },
  { name: 'OC Inspection & Resident Handover', status: 'upcoming', date_label: 'Q4 2026', sort_order: 6 },
];

export default function ConstructionMilestonesEditor({ projectId }: ConstructionMilestonesEditorProps) {
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/milestones`, {
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
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/milestones`, {
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
        name: 'New Milestone Phase',
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
    return <div className="h-48 bg-slate-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />;
  }

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const inProgressCount = milestones.filter(m => m.status === 'in_progress').length;
  const overallPct = milestones.length > 0
    ? Math.round(((completedCount + inProgressCount * 0.5) / milestones.length) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center font-bold">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Construction & Development Spine ({overallPct}% Complete)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {completedCount} Completed · {inProgressCount} Active · {milestones.length - completedCount - inProgressCount} Upcoming
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addMilestone}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Add Phase Stage
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-full text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save Milestones'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Milestones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {milestones.map((m, idx) => {
          const isCompleted = m.status === 'completed';
          const isInProgress = m.status === 'in_progress';

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                isCompleted
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
                  : isInProgress
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60 ring-2 ring-amber-400/20'
                  : 'bg-slate-50/60 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-700/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isCompleted ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                  isInProgress ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                  'bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300'
                }`}>
                  Phase {idx + 1}
                </span>

                <button
                  onClick={() => removeMilestone(idx)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                  title="Remove Phase"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Stage Description
                </label>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                  className="w-full text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Status
                  </label>
                  <CustomSelect
                    value={m.status}
                    onChange={(val) => updateMilestone(idx, 'status', val as any)}
                    options={[
                      { value: 'completed', label: 'Completed', dotColor: 'bg-emerald-500' },
                      { value: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-500' },
                      { value: 'upcoming', label: 'Upcoming', dotColor: 'bg-zinc-400' },
                    ]}
                    size="sm"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Quarter / Date
                  </label>
                  <input
                    type="text"
                    value={m.date_label || ''}
                    placeholder="Q4 2025"
                    onChange={(e) => updateMilestone(idx, 'date_label', e.target.value)}
                    className="w-full text-xs font-semibold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
