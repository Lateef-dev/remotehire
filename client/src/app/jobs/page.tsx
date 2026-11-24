import { Suspense } from 'react';
import JobsClient from './JobsClient';
import { PageLoader } from '@/components/ui';

export const metadata = { title: 'Remote jobs' };

export default function JobsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <JobsClient />
    </Suspense>
  );
}
