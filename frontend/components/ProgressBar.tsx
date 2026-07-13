'use client';

import dynamic from 'next/dynamic';

const ProgressBar = dynamic(
  () => import('next-nprogress-bar').then((mod) => mod.AppProgressBar),
  { ssr: false }
);

export default function NextProgressBar() {
  return (
    <ProgressBar
      height="3px"
      color="hsl(220, 78%, 56%)"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
