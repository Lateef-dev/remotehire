'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAppDispatch } from '@/store';
import { useApplyToJobMutation, useGetJobQuery, useGetMeQuery, useToggleSavedJobMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import ResumeUpload from '@/components/ResumeUpload';
import { Alert, CompanyLogo, EmptyState, Field, PageLoader, StatusBadge } from '@/components/ui';
import { errorMessage, formatSalary, label, timeAgo } from '@/lib/format';
import type { Job, JobViewer, User } from '@/lib/types';

function ApplyPanel({ job, viewer, user }: { job: Job; viewer: JobViewer | null; user?: User }) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState(user?.resumeUrl ?? '');
  // Prefer an uploaded file; fall back to the profile link if that's all they have.
  const [source, setSource] = useState<'file' | 'link'>(!user?.resumeFile && user?.resumeUrl ? 'link' : 'file');
  const [apply, { isLoading, error }] = useApplyToJobMutation();

  if (!user) {
    return (
      <div className="space-y-2">
        <Link href={`/login?next=/jobs/${job._id}`} className="btn-primary w-full">Sign in to apply</Link>
        <Link href={`/register?next=/jobs/${job._id}`} className="btn-secondary w-full">Create a free account</Link>
      </div>
    );
  }

  if (viewer?.isOwner) {
    return (
      <div className="space-y-2">
        <Link href={`/dashboard/jobs/${job._id}/applicants`} className="btn-primary w-full">View {job.applicationsCount} applicants</Link>
        <Link href={`/dashboard/jobs/${job._id}/edit`} className="btn-secondary w-full">Edit job</Link>
      </div>
    );
  }

  if (user.role === 'employer') return <p className="text-sm text-muted">Sign in with a candidate account to apply.</p>;

  if (viewer?.hasApplied) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm">
        <p className="font-semibold">You applied to this job</p>
        <div className="mt-2 flex items-center gap-2">
          Status: <StatusBadge status={viewer.applicationStatus ?? 'submitted'} />
        </div>
        <Link href="/dashboard" className="mt-3 inline-block font-semibold text-brand-700 hover:underline">Track your applications →</Link>
      </div>
    );
  }

  if (job.status !== 'open') return <p className="text-sm text-muted">This job is no longer accepting applications.</p>;

  if (!open) return <button className="btn-primary w-full" onClick={() => setOpen(true)}>Apply now</button>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apply({
        id: job._id,
        coverLetter: coverLetter || undefined,
        resumeSource: source,
        resumeUrl: source === 'link' ? resumeUrl || undefined : undefined,
      }).unwrap();
      dispatch(pushToast(`Application sent to ${job.companyName}`));
    } catch {
      /* error shown below */
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>{error && errorMessage(error)}</Alert>
      <div>
        <p className="label">Resume</p>
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="How to share your resume">
          {(
            [
              ['file', 'Upload a file'],
              ['link', 'Share a link'],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={source === value}
              onClick={() => setSource(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${source === value ? 'bg-white shadow-sm' : 'text-muted'}`}
            >
              {text}
            </button>
          ))}
        </div>
        {source === 'file' ? (
          <ResumeUpload user={user} />
        ) : (
          <Field htmlFor="resumeUrl" hint="A public link to your CV (Google Drive, Dropbox, LinkedIn or your own site).">
            <input id="resumeUrl" type="url" required className="input" placeholder="https://…" aria-label="Resume link" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Cover letter (optional)" htmlFor="coverLetter">
        <textarea id="coverLetter" rows={5} maxLength={5000} className="input" placeholder={`Why are you a great fit for ${job.companyName}?`} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn-primary flex-1" disabled={isLoading || (source === 'file' && !user.resumeFile)}>{isLoading ? 'Sending…' : 'Submit application'}</button>
      </div>
    </form>
  );
}

export default function JobDetailClient() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useGetMeQuery();
  const { data, isLoading, error } = useGetJobQuery(id);
  const [toggleSaved, { isLoading: saving }] = useToggleSavedJobMutation();
  const dispatch = useAppDispatch();

  if (isLoading) return <PageLoader />;
  if (error || !data) {
    const status = error && 'status' in error ? error.status : undefined;
    return (
      <div className="container-page py-12">
        <EmptyState
          title={status === 404 || status === 400 ? 'Job not found' : 'Could not load this job'}
          body="It may have been removed by the employer."
          action={<Link href="/jobs" className="btn-primary">Browse jobs</Link>}
        />
      </div>
    );
  }

  const { job, viewer } = data;
  const salary = formatSalary(job);
  const company = job.employer?.company ?? {};

  const onSave = async () => {
    await toggleSaved({ id: job._id, saved: viewer?.isSaved }).unwrap();
    dispatch(pushToast(viewer?.isSaved ? 'Removed from saved jobs' : 'Job saved'));
  };

  return (
    <div className="container-page py-8">
      <Link href="/jobs" className="text-sm font-medium text-muted hover:text-ink">← All jobs</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <article className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-4">
            <CompanyLogo name={job.companyName} url={job.companyLogoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
              <p className="mt-1 text-muted">{job.companyName} · Posted {timeAgo(job.createdAt)}</p>
            </div>
            {job.status === 'closed' && <StatusBadge status="closed" />}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4">
            {[
              ['Type', label(job.type)],
              ['Level', label(job.level)],
              ['Region', label(job.region)],
              ['Salary', salary ?? 'Not listed'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          {job.tags?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {job.tags.map((t) => (
                <Link key={t} href={`/jobs?tags=${encodeURIComponent(t)}`} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100">{t}</Link>
              ))}
            </div>
          )}

          <h2 className="mt-8 text-lg font-semibold">About the role</h2>
          <div className="mt-2 leading-relaxed whitespace-pre-line text-slate-700">{job.description}</div>

          {job.requirements?.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-semibold">What you will need</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                {job.requirements.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </>
          )}
          {job.timezone && <p className="mt-6 text-sm text-muted">Time zone overlap: {job.timezone}</p>}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Interested?</p>
              {user?.role === 'candidate' && (
                <button onClick={onSave} disabled={saving} className="btn-ghost px-2 py-1" aria-pressed={viewer?.isSaved}>
                  {viewer?.isSaved ? '★ Saved' : '☆ Save'}
                </button>
              )}
            </div>
            <ApplyPanel key={`${user?._id}-${viewer?.hasApplied}`} job={job} viewer={viewer} user={user} />
            <p className="mt-4 text-xs text-muted">{job.applicationsCount} {job.applicationsCount === 1 ? 'person has' : 'people have'} applied</p>
          </div>

          <div className="card p-5">
            <p className="font-semibold">About {job.companyName}</p>
            <p className="mt-2 text-sm text-muted">{company.about || 'This company has not added a description yet.'}</p>
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
                Visit website ↗
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
