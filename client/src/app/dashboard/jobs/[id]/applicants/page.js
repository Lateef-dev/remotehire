'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import RequireAuth from '@/components/RequireAuth';
import { EmptyState, PageLoader, StatusBadge } from '@/components/ui';
import { useGetApplicantsQuery, useUpdateApplicationStatusMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import { APPLICATION_STATUSES } from '@/lib/constants';
import { errorMessage, initials, label, timeAgo } from '@/lib/format';

function ApplicantCard({ application }) {
  const { candidate } = application;
  const [expanded, setExpanded] = useState(false);
  const [updateStatus, { isLoading }] = useUpdateApplicationStatusMutation();
  const dispatch = useDispatch();

  const onChange = async (e) => {
    const status = e.target.value;
    try {
      await updateStatus({ id: application._id, status }).unwrap();
      dispatch(pushToast(`${candidate.name} moved to ${label(status)}`));
    } catch (err) {
      dispatch(pushToast(errorMessage(err), 'error'));
    }
  };

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{initials(candidate.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{candidate.name}</p>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-sm text-muted">{candidate.headline || 'No headline'}{candidate.location ? ` · ${candidate.location}` : ''}</p>
          <p className="text-xs text-muted">Applied {timeAgo(application.createdAt)} · <a className="hover:underline" href={`mailto:${candidate.email}`}>{candidate.email}</a></p>
          {candidate.skills?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">{candidate.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <select className="input w-44" value={application.status} onChange={onChange} disabled={isLoading} aria-label={`Status for ${candidate.name}`}>
            {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <div className="flex gap-3 text-sm font-semibold text-brand-700">
            <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Resume ↗</a>
            {candidate.portfolioUrl && <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Portfolio ↗</a>}
          </div>
        </div>
      </div>
      {application.coverLetter && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          <p className={`whitespace-pre-line text-slate-700 ${expanded ? '' : 'line-clamp-3'}`}>{application.coverLetter}</p>
          {application.coverLetter.length > 200 && (
            <button className="mt-1 text-xs font-semibold text-brand-700" onClick={() => setExpanded((x) => !x)}>{expanded ? 'Show less' : 'Read more'}</button>
          )}
        </div>
      )}
    </li>
  );
}

function Applicants() {
  const { id } = useParams();
  const [status, setStatus] = useState('');
  const { data, isLoading, error } = useGetApplicantsQuery({ jobId: id, status: status || undefined });

  if (isLoading) return <PageLoader />;
  if (error) {
    return <div className="container-page py-12"><EmptyState title="You cannot view these applicants" body={errorMessage(error)} action={<Link href="/dashboard" className="btn-primary">Back to dashboard</Link>} /></div>;
  }

  return (
    <div className="container-page max-w-4xl py-8">
      <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">← Dashboard</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Applicants</h1>
      <p className="text-muted">for <Link href={`/jobs/${id}`} className="font-medium text-ink hover:underline">{data.job.title}</Link></p>

      <div className="my-6 flex flex-wrap gap-2" role="tablist">
        {['', ...APPLICATION_STATUSES].map((s) => (
          <button
            key={s || 'all'}
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${status === s ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'}`}
          >
            {s ? label(s) : 'All'}
          </button>
        ))}
      </div>

      {data.applications.length === 0 ? (
        <EmptyState title={status ? `No ${label(status).toLowerCase()} applicants` : 'No applicants yet'} body="Share the job link to get more applicants." />
      ) : (
        <ul className="space-y-3">{data.applications.map((a) => <ApplicantCard key={a._id} application={a} />)}</ul>
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <RequireAuth role="employer">
      <Applicants />
    </RequireAuth>
  );
}
