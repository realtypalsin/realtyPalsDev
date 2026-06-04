'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Users } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LeadSnapshotPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem('user_id'));
  }, []);

  return (
    <div className="flex h-[100dvh] bg-[#E6E6E6] overflow-hidden">
      <Sidebar userId={userId} />
      <main className="flex-1 h-full flex flex-col min-h-0 overflow-hidden">
        <Header title="Lead Snapshot" onToast={() => {}} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Users size={32} className="text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Snapshot</h2>
          <p className="text-gray-500 max-w-sm">
            Qualified lead tracking and buyer intent analytics. Coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
