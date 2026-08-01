'use client';

import React, { useState } from 'react';
import { TrendingUp, Zap, Building2, Home, BarChart3, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface IntelligenceData {
  financial_intelligence?: Record<string, any>;
  market_intelligence?: Record<string, any>;
  builder_intelligence?: Record<string, any>;
  property_intelligence?: Record<string, any>;
  comparative_analysis?: Record<string, any>;
  resources_documents?: Record<string, any>;
  last_verified_at?: string;
}

interface IntelligenceTabsProps {
  data: IntelligenceData;
  isAdmin?: boolean;
}

const IntelligenceField: React.FC<{ label: string; value: any }> = ({ label, value }) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (
      <div className="mb-3">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</div>
        <ul className="space-y-1">
          {value.map((item, i) => (
            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>{typeof item === 'object' ? JSON.stringify(item) : item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (typeof value === 'object') {
    return (
      <div className="mb-3">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</div>
        <div className="bg-gray-50 rounded p-2 text-sm text-gray-700 overflow-auto max-h-40">
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</div>
      <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
    </div>
  );
};

const TabContent: React.FC<{ data: Record<string, any> | undefined; title: string }> = ({
  data,
  title
}) => {
  if (!data) {
    return (
      <div className="py-8 text-center text-gray-400">
        <AlertCircle className="mx-auto mb-2 opacity-50" size={24} />
        <p className="text-sm">{title} not yet populated</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {Object.entries(data).map(([key, value]) => (
        <IntelligenceField
          key={key}
          label={key.replace(/_/g, ' ')}
          value={value}
        />
      ))}
    </div>
  );
};

type TabKey = 'financial' | 'market' | 'builder' | 'property' | 'comparative' | 'resources';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; title: string }[] = [
  { key: 'financial',   label: 'Financial', icon: <TrendingUp size={14} />, title: 'Financial Intelligence' },
  { key: 'market',      label: 'Market',    icon: <BarChart3 size={14} />,  title: 'Market Intelligence' },
  { key: 'builder',     label: 'Builder',   icon: <Building2 size={14} />,  title: 'Builder Intelligence' },
  { key: 'property',    label: 'Property',  icon: <Home size={14} />,       title: 'Property Intelligence' },
  { key: 'comparative', label: 'Compare',   icon: <Zap size={14} />,        title: 'Comparative Analysis' },
  { key: 'resources',   label: 'Docs',      icon: <FileText size={14} />,   title: 'Resources & Documents' },
];

export default function IntelligenceTabs({ data, isAdmin = false }: IntelligenceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('financial');

  const blockFor: Record<TabKey, Record<string, any> | undefined> = {
    financial: data.financial_intelligence,
    market: data.market_intelligence,
    builder: data.builder_intelligence,
    property: data.property_intelligence,
    comparative: data.comparative_analysis,
    resources: data.resources_documents,
  };

  const hasAnyIntelligence = !!(
    data.financial_intelligence ||
    data.market_intelligence ||
    data.builder_intelligence ||
    data.property_intelligence ||
    data.comparative_analysis ||
    data.resources_documents
  );

  if (!hasAnyIntelligence) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="mx-auto mb-3 text-gray-300" size={32} />
        <p className="text-gray-500">Intelligence data not available</p>
        {isAdmin && <p className="text-xs text-gray-400 mt-2">Generate from admin panel</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Verification Status */}
      {data.last_verified_at && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle2 size={16} className="text-green-600" />
          <span className="text-xs text-green-700">
            Last verified: {new Date(data.last_verified_at).toLocaleDateString()}
          </span>
        </div>
      )}

      <div className="w-full">
        <div
          role="tablist"
          aria-label="Intelligence sections"
          className="grid grid-cols-3 lg:grid-cols-6 gap-1 p-1 bg-gray-100 rounded-lg"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`intel-tab-${tab.key}`}
                aria-selected={isActive}
                aria-controls={`intel-panel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {TABS.map((tab) => (
          <div
            key={tab.key}
            role="tabpanel"
            id={`intel-panel-${tab.key}`}
            aria-labelledby={`intel-tab-${tab.key}`}
            hidden={activeTab !== tab.key}
          >
            {activeTab === tab.key && (
              <TabContent data={blockFor[tab.key]} title={tab.title} />
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="pt-4 border-t flex gap-2">
          <button className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
            Edit Intelligence
          </button>
          <button className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
