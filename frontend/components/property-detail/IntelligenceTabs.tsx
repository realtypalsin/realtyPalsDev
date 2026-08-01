'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function IntelligenceTabs({ data, isAdmin = false }: IntelligenceTabsProps) {
  const [editingField, setEditingField] = useState<string | null>(null);

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

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="financial" className="flex gap-1">
            <TrendingUp size={14} />
            <span className="hidden sm:inline text-xs">Financial</span>
          </TabsTrigger>
          <TabsTrigger value="market" className="flex gap-1">
            <BarChart3 size={14} />
            <span className="hidden sm:inline text-xs">Market</span>
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex gap-1">
            <Building2 size={14} />
            <span className="hidden sm:inline text-xs">Builder</span>
          </TabsTrigger>
          <TabsTrigger value="property" className="flex gap-1">
            <Home size={14} />
            <span className="hidden sm:inline text-xs">Property</span>
          </TabsTrigger>
          <TabsTrigger value="comparative" className="flex gap-1">
            <Zap size={14} />
            <span className="hidden sm:inline text-xs">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex gap-1">
            <FileText size={14} />
            <span className="hidden sm:inline text-xs">Docs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <TabContent data={data.financial_intelligence} title="Financial Intelligence" />
        </TabsContent>

        <TabsContent value="market">
          <TabContent data={data.market_intelligence} title="Market Intelligence" />
        </TabsContent>

        <TabsContent value="builder">
          <TabContent data={data.builder_intelligence} title="Builder Intelligence" />
        </TabsContent>

        <TabsContent value="property">
          <TabContent data={data.property_intelligence} title="Property Intelligence" />
        </TabsContent>

        <TabsContent value="comparative">
          <TabContent data={data.comparative_analysis} title="Comparative Analysis" />
        </TabsContent>

        <TabsContent value="resources">
          <TabContent data={data.resources_documents} title="Resources & Documents" />
        </TabsContent>
      </Tabs>

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
