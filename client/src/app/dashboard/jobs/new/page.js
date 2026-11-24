'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import RequireAuth from '@/components/RequireAuth';
import JobForm from '@/components/JobForm';
import { useCreateJobMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';

export default function NewJobPage() {
  const [createJob, { isLoading, error }] = useCreateJobMutation();
  const router = useRouter();
  const dispatch = useDispatch();

  const submit = async (payload) => {
    try {
      const { job } = await createJob(payload).unwrap();
      dispatch(pushToast('Job published'));
      router.push(`/jobs/${job._id}`);
    } catch {
      /* shown in form */
    }
  };

  return (
    <RequireAuth role="employer">
      <div className="container-page max-w-3xl py-8">
        <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">← Dashboard</Link>
        <h1 className="mt-3 mb-6 text-3xl font-bold tracking-tight">Post a remote job</h1>
        <JobForm onSubmit={submit} isLoading={isLoading} error={error} submitLabel="Publish job" />
      </div>
    </RequireAuth>
  );
}
