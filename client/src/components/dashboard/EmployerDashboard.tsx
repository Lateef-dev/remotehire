'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAppDispatch } from '@/store';
import { useDeleteJobMutation, useGetMyJobsQuery, useUpdateJobMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import { EmptyState, Spinner, StatusBadge } from '@/components/ui';
import StatTile from './StatTile';
import { errorMessage, label, timeAgo } from '@/lib/format';
import type { ApplicationStatus, MyJob, Pipeline as PipelineCounts, User } from '@/lib/types';

const PIPELINE_COLORS: Record<ApplicationStatus, string> = {
  submitted: 'bg-slate-300',
  reviewing: 'bg-amber-400',
  shortlisted: 'bg-brand-500',
  hired: 'bg-emerald-500',
  rejected: 'bg-red-300',
};

function Pipeline({ pipeline }: { pipeline: PipelineCounts }) {
  const total = Object.values(pipeline).reduce((a, b) => a + b, 0);
  if (!total) return <span className="text-xs text-muted">No applicants yet</span>;
  return (
    <div className="w-full max-w-48">
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {(Object.entries(PIPELINE_COLORS) as [ApplicationStatus, string][]).map(([status, color]) =>
          pipeline[status] ? <div key={status} className={color} style={{ width: `${(pipeline[status] / total) * 100}%` }} title={`${label(status)}: ${pipeline[status]}`} /> : null
        )}
      </div>
      <p className="mt-1 text-xs text-muted">{pipeline.shortlisted} shortlisted · {pipeline.submitted} new</p>
    </div>
  );
}

function JobRow({ job }: { job: MyJob }) {
  const dispatch = useAppDispatch();
  const [confirming, setConfirming] = useState(false);
  const [updateJob, { isLoading: updating }] = useUpdateJobMutation();
  const [deleteJob, { isLoading: deleting }] = useDeleteJobMutation();

  const run = async (fn: () => { unwrap: () => Promise<unknown> }, message: string) => {
    try {
      await fn().unwrap();
      dispatch(pushToast(message));
    } catch (err) {
      dispatch(pushToast(errorMessage(err), 'error'));
    }
  };

  const nextStatus = job.status === 'open' ? 'closed' : 'open';

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/jobs/${job._id}`} className="truncate font-semibold hover:text-brand-700">{job.title}</Link>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-muted">{label(job.type)} · {label(job.level)} · {label(job.region)} · Posted {timeAgo(job.createdAt)}</p>
        </div>
        <Pipeline pipeline={job.pipeline} />
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/jobs/${job._id}/applicants`} className="btn-primary px-3 py-2">Applicants ({job.applicationsCount})</Link>
          <Link href={`/dashboard/jobs/${job._id}/edit`} className="btn-secondary px-3 py-2">Edit</Link>
          <button
            className="btn-secondary px-3 py-2"
            disabled={updating}
            onClick={() => run(() => updateJob({ id: job._id, status: nextStatus }), nextStatus === 'closed' ? 'Job closed' : 'Job reopened')}
          >
            {job.status === 'open' ? 'Close' : 'Reopen'}
          </button>
          <button className="btn-danger px-3 py-2" onClick={() => setConfirming(true)}>Delete</button>
        </div>
      </div>
      {confirming && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <p>Delete this job and its {job.applicationsCount} applications? This cannot be undone.</p>
          <div className="flex gap-2">
            <button className="btn-secondary px-3 py-1.5" onClick={() => setConfirming(false)}>Cancel</button>
            <button className="btn bg-red-600 px-3 py-1.5 text-white hover:bg-red-700" disabled={deleting} onClick={() => run(() => deleteJob(job._id), 'Job deleted')}>
              Yes, delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function EmployerDashboard({ user }: { user: User }) {
  const { data, isLoading } = useGetMyJobsQuery();
  const apps = data?.stats.applications;
  const totalApps = apps ? Object.values(apps).reduce((a, b) => a + b, 0) : '–';

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.company?.name ?? 'Your company'}</h1>
          <p className="text-muted">Manage your job posts and hiring pipeline.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/profile" className="btn-secondary">Company profile</Link>
          <Link href="/dashboard/jobs/new" className="btn-primary">Post a job</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Open jobs" value={data?.stats.openJobs ?? '–'} />
        <StatTile label="Total applicants" value={totalApps} />
        <StatTile label="Shortlisted" value={apps?.shortlisted ?? '–'} tone="text-brand-700" />
        <StatTile label="Hired" value={apps?.hired ?? '–'} tone="text-emerald-700" />
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Your jobs</h2>
      {isLoading && <Spinner />}
      {data?.jobs.length === 0 && (
        <EmptyState title="You have not posted any jobs" body="Post your first role to start receiving applications." action={<Link href="/dashboard/jobs/new" className="btn-primary">Post a job</Link>} />
      )}
      <ul className="space-y-3">{data?.jobs.map((job) => <JobRow key={job._id} job={job} />)}</ul>
    </>
  );
}
