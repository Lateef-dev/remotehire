'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store';
import RequireAuth from '@/components/RequireAuth';
import JobForm from '@/components/JobForm';
import { EmptyState, PageLoader } from '@/components/ui';
import { useGetJobQuery, useUpdateJobMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import type { JobInput } from '@/lib/types';

function EditJob() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useGetJobQuery(id);
  const [updateJob, { isLoading: saving, error }] = useUpdateJobMutation();
  const router = useRouter();
  const dispatch = useAppDispatch();

  if (isLoading) return <PageLoader />;
  if (!data || !data.viewer?.isOwner) {
    return <div className="container-page py-12"><EmptyState title="You can only edit jobs you posted" action={<Link href="/dashboard" className="btn-primary">Back to dashboard</Link>} /></div>;
  }

  const submit = async (payload: JobInput) => {
    try {
      await updateJob({ id, ...payload }).unwrap();
      dispatch(pushToast('Job updated'));
      router.push('/dashboard');
    } catch {
      /* shown in form */
    }
  };

  return (
    <div className="container-page max-w-3xl py-8">
      <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">← Dashboard</Link>
      <h1 className="mt-3 mb-6 text-3xl font-bold tracking-tight">Edit job</h1>
      <JobForm job={data.job} onSubmit={submit} isLoading={saving} error={error} submitLabel="Save changes" />
    </div>
  );
}

export default function EditJobPage() {
  return (
    <RequireAuth role="employer">
      <EditJob />
    </RequireAuth>
  );
}
