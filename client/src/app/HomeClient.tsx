'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useGetJobMetaQuery, useGetJobsQuery } from '@/store/api';
import JobCard, { JobCardSkeleton } from '@/components/JobCard';

export default function HomeClient() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const { data: meta } = useGetJobMetaQuery();
  const { data: latest, isLoading } = useGetJobsQuery({ limit: 6 });

  const search = (e: FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/jobs?q=${encodeURIComponent(q.trim())}` : '/jobs');
  };

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container-page py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {meta ? `${meta.counts.openJobs} open roles from ${meta.counts.companies} companies` : 'Remote roles, updated daily'}
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Find a remote developer job you can do <span className="text-brand-600">from anywhere</span>.
            </h1>
            <p className="mt-4 text-lg text-muted">
              Filter by region, level and salary, apply in one click, and track every application in one place.
            </p>

            <form onSubmit={search} className="mt-8 flex flex-col gap-2 sm:flex-row">
              <input
                className="input h-12 flex-1 text-base"
                placeholder="Job title, skill or company (e.g. React)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search jobs"
              />
              <button className="btn-primary h-12 px-6">Search jobs</button>
            </form>

            {meta && meta.popularTags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">Popular:</span>
                {meta.popularTags.slice(0, 8).map(({ tag }) => (
                  <Link key={tag} href={`/jobs?tags=${encodeURIComponent(tag)}`} className="chip hover:bg-brand-50 hover:text-brand-700">
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Latest remote jobs</h2>
            <p className="text-sm text-muted">Fresh roles posted by remote-first teams.</p>
          </div>
          <Link href="/jobs" className="text-sm font-semibold text-brand-700 hover:underline">View all →</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <JobCardSkeleton key={i} />)
            : latest?.items.map((job) => <JobCard key={job._id} job={job} />)}
        </div>
      </section>

      <section className="container-page">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Search that respects time zones', 'Worldwide roles show up for every region, so you never miss a job you can actually take.'],
            ['Apply in one click', 'Upload your resume once, then apply with an optional cover letter.'],
            ['Track every application', 'See when an employer reviews, shortlists or hires you.'],
          ].map(([title, body]) => (
            <div key={title} className="card p-6">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-900 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-bold">Hiring remote developers?</h3>
            <p className="mt-1 text-brand-100">Post a job, review applicants and move them through your pipeline.</p>
          </div>
          <Link href="/register?role=employer" className="btn bg-white text-brand-900 hover:bg-brand-50">Post a job</Link>
        </div>
      </section>
    </>
  );
}
