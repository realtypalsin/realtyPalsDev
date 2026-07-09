import React from 'react';
import { Info, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function RealtyBox({ type, title, children }: { type: string, title?: string, children: React.ReactNode }) {
  const isAlert = type === 'alert' || type === 'risk';
  const isSuccess = type === 'success';
  
  const bgClass = isAlert ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                : isSuccess ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
  const textClass = isAlert ? 'text-red-800 dark:text-red-300' 
                  : isSuccess ? 'text-emerald-800 dark:text-emerald-300'
                  : 'text-blue-800 dark:text-blue-300';
  const Icon = isAlert ? AlertTriangle : isSuccess ? ShieldCheck : Info;

  return (
    <div className={`my-4 p-4 rounded-xl border ${bgClass} flex gap-3 shadow-sm`}>
      <Icon className={`mt-0.5 w-5 h-5 flex-shrink-0 ${textClass}`} />
      <div>
        {title && <p className={`font-semibold text-sm mb-1 ${textClass}`}>{title}</p>}
        <div className={`text-sm opacity-90 ${textClass}`}>{children}</div>
      </div>
    </div>
  );
}
