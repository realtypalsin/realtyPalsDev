'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RealtyChart({ type, data, title }: { type: string, data: string, title?: string }) {
  const parsedData = useMemo(() => {
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return [];
    }
  }, [data]);

  if (!parsedData || parsedData.length === 0) {
    return (
      <div className="my-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111] shadow-sm flex items-center justify-center h-32">
        <p className="text-sm text-gray-500 dark:text-gray-400">Chart data unavailable</p>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111] shadow-sm">
      {title && <h4 className="text-sm font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h4>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={parsedData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} width={40} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                itemStyle={{ fontSize: 13, fontWeight: 600 }}
                labelStyle={{ fontSize: 12, color: '#666', marginBottom: 4 }}
              />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          ) : (
            <BarChart data={parsedData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} width={40} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                itemStyle={{ fontSize: 13, fontWeight: 600 }}
                labelStyle={{ fontSize: 12, color: '#666', marginBottom: 4 }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
