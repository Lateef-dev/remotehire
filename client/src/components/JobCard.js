import Link from 'next/link';
import { CompanyLogo } from './ui';
import { formatSalary, label, timeAgo } from '@/lib/format';

export default function JobCard({ job }) {
  const salary = formatSalary(job);
  return (
    <Link
      href={`/jobs/${job._id}`}
      className="card group flex gap-4 p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <CompanyLogo name={job.companyName} url={job.companyLogoUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <h3 className="truncate font-semibold group-hover:text-brand-700">{job.title}</h3>
            <p className="text-sm text-muted">{job.companyName}</p>
          </div>
          {salary && <span className="text-sm font-semibold text-emerald-700">{salary}</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="chip">{label(job.type)}</span>
          <span className="chip">{label(job.level)}</span>
          <span className="chip">🌍 {label(job.region)}</span>
          {job.tags?.slice(0, 3).map((t) => (
            <span key={t} className="chip bg-brand-50 text-brand-700">{t}</span>
          ))}
          <span className="ml-auto text-xs text-muted">{timeAgo(job.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="card flex animate-pulse gap-4 p-5">
      <div className="h-11 w-11 rounded-xl bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-1/4 rounded bg-slate-200" />
        <div className="mt-4 flex gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-200" />
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
