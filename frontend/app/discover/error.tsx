'use client';

import { useEffect } from 'react';

export default function DiscoverError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ChunkLoadError = stale cache after deploy — auto-refresh
    if (error?.message?.includes('ChunkLoadError') || error?.message?.includes('Loading chunk')) {
      window.location.reload();
      return;
    }
    console.error('[discover-error]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-[#E6E6E6] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-5xl">😔</div>
        <h2 className="text-xl font-semibold text-gray-800">Chat temporarily unavailable</h2>
        <p className="text-gray-500 text-sm">
          Something went wrong loading the chat. This usually fixes itself on refresh.
        </p>
        <button
          onClick={() => {
            if ('caches' in window) {
              caches.keys().then(names => names.forEach(name => caches.delete(name)));
            }
            reset();
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-colors"
        >
          Reload Chat
        </button>
      </div>
    </div>
  );
}
