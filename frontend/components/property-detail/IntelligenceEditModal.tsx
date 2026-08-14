'use client';

import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { API_BASE } from '@/lib/env';

interface IntelligenceEditModalProps {
  projectId: string;
  field: 'financial_intelligence' | 'market_intelligence' | 'builder_intelligence' | 'property_intelligence' | 'comparative_analysis' | 'resources_documents';
  currentData?: Record<string, any>;
  onClose: () => void;
  onSave?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  financial_intelligence: 'Financial Intelligence',
  market_intelligence: 'Market Intelligence',
  builder_intelligence: 'Builder Intelligence',
  property_intelligence: 'Property Intelligence',
  comparative_analysis: 'Comparative Analysis',
  resources_documents: 'Resources & Documents'
};

export default function IntelligenceEditModal({
  projectId,
  field,
  currentData = {},
  onClose,
  onSave
}: IntelligenceEditModalProps) {
  const [editData, setEditData] = useState<Record<string, any>>(currentData || {});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/admin/intelligence/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          data: editData,
          notes
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update intelligence');
      }

      setSuccess(true);
      setTimeout(() => {
        onSave?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setEditData((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-lg font-semibold">{FIELD_LABELS[field]}</h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <Check size={16} className="flex-shrink-0 mt-0.5" />
              Saved successfully
            </div>
          )}

          {/* Dynamic Field Editor */}
          <div className="space-y-3">
            {Object.entries(editData).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  {key.replace(/_/g, ' ')}
                </label>
                {Array.isArray(value) ? (
                  <textarea
                    value={value.join('\n')}
                    onChange={(e) =>
                      handleFieldChange(key, e.target.value.split('\n').filter(Boolean))
                    }
                    className="w-full p-2 border border-gray-200 rounded text-sm font-mono"
                    rows={3}
                    placeholder="Enter items, one per line"
                  />
                ) : typeof value === 'object' ? (
                  <textarea
                    value={JSON.stringify(value, null, 2)}
                    onChange={(e) => {
                      try {
                        handleFieldChange(key, JSON.parse(e.target.value));
                      } catch {
                        // Allow invalid JSON while editing
                      }
                    }}
                    className="w-full p-2 border border-gray-200 rounded text-sm font-mono"
                    rows={6}
                    placeholder={`${key} (JSON)`}
                  />
                ) : (
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                    placeholder={key}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Admin Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded text-sm"
              rows={3}
              placeholder="Document what changed and why..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
