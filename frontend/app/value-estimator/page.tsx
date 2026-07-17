'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ValueEstimatorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/discover?feature=value-estimator');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
