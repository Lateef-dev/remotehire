'use client';

import Link from 'next/link';
import { useAppDispatch } from '@/store';
import { useGetMyApplicationsQuery, useGetSavedJobsQuery, useWithdrawApplicationMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import { CompanyLogo, EmptyState, Spinner, StatusBadge } from '@/components/ui';
import JobCard from '@/components/JobCard';
import StatTile from './StatTile';
import { errorMessage, label, timeAgo } from '@/lib/format';
import type { ApplicationStatus, User } from '@/lib/types';

export default function CandidateDashboard({ user }: { user: User }) {
  const { data: applications, isLoading } = useGetMyApplicationsQuery();
  const { data: saved } = useGetSavedJobsQuery();
  const [withdraw, { isLoading: withdrawing }] = useWithdrawApplicationMutation();
  const dispatch = useAppDispatch();

  const count = (status: ApplicationStatus) => applications?.filter((a) => a.status === status).length ?? 0;

  const onWithdraw = async (id: string) => {
    try {
      await withdraw(id).unwrap();
      dispatch(pushToast('Application withdrawn'));
    } catch (err) {
      dispatch(pushToast(errorMessage(err), 'error'));
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hi {user.name.split(' ')[0]} 👋</h1>
          <p className="text-muted">Here is where your job search stands.</p>
        </div>
        <Link href="/jobs" className="btn-primary">Find more jobs</Link>
      </div>

      {!user.resumeUrl && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Add a resume link to your profile so you can apply in one click.</p>
          <Link href="/profile" className="btn bg-amber-900 text-white hover:bg-amber-800">Complete profile</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Applications" value={applications?.length ?? '–'} />
        <StatTile label="In review" value={count('reviewing')} tone="text-amber-700" />
        <StatTile label="Shortlisted" value={count('shortlisted')} tone="text-brand-700" />
        <StatTile label="Offers" value={count('hired')} tone="text-emerald-700" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-3 text-lg font-semibold">My applications</h2>
          {isLoading && <Spinner />}
          {applications?.length === 0 && (
            <EmptyState title="No applications yet" body="When you apply to a job it will show up here." action={<Link href="/jobs" className="btn-primary">Browse jobs</Link>} />
          )}
          <ul className="space-y-3">
            {applications?.map((a) => (
              <li key={a._id} className="card flex flex-wrap items-center gap-4 p-4">
                {a.job ? (
                  <>
                    <CompanyLogo name={a.job.companyName} url={a.job.companyLogoUrl} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs/${a.job._id}`} className="font-semibold hover:text-brand-700">{a.job.title}</Link>
                      <p className="text-sm text-muted">
                        {a.job.companyName} · {label(a.job.type)} · Applied {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="flex-1 text-sm text-muted">This job was removed by the employer.</p>
                )}
                <StatusBadge status={a.status} />
                {['submitted', 'reviewing'].includes(a.status) && (
                  <button className="btn-ghost px-2 py-1 text-xs" disabled={withdrawing} onClick={() => onWithdraw(a._id)}>Withdraw</button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Saved jobs</h2>
          {saved?.length === 0 && <p className="card p-4 text-sm text-muted">Tap ☆ Save on any job to keep it here.</p>}
          <div className="space-y-3">{saved?.map((job) => <JobCard key={job._id} job={job} />)}</div>
        </section>
      </div>
    </>
  );
}
