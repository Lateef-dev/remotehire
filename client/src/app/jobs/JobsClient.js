'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useGetJobMetaQuery, useGetJobsQuery } from '@/store/api';
import JobCard, { JobCardSkeleton } from '@/components/JobCard';
import { EmptyState } from '@/components/ui';
import { JOB_LEVELS, JOB_TYPES, REGIONS, SALARY_STEPS } from '@/lib/constants';
import { label } from '@/lib/format';

const LIST_KEYS = ['type', 'level', 'region', 'tags'];

function readFilters(params) {
  const filters = {
    q: params.get('q') ?? '',
    minSalary: params.get('minSalary') ?? '',
    sort: params.get('sort') ?? 'newest',
    page: Number(params.get('page') ?? 1),
  };
  for (const key of LIST_KEYS) filters[key] = params.get(key)?.split(',').filter(Boolean) ?? [];
  return filters;
}

function CheckboxGroup({ title, options, selected, onToggle }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</legend>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line accent-brand-600"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
            />
            {label(opt)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function JobsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = readFilters(params);
  const [search, setSearch] = useState(filters.q);
  const [showFilters, setShowFilters] = useState(false);

  const { data: meta } = useGetJobMetaQuery();
  const { data, isFetching, isError } = useGetJobsQuery({ ...filters, limit: 10 });

  useEffect(() => setSearch(filters.q), [filters.q]);

  const update = (changes, { resetPage = true } = {}) => {
    const next = { ...filters, ...changes, ...(resetPage && { page: 1 }) };
    const sp = new URLSearchParams();
    if (next.q) sp.set('q', next.q);
    for (const key of LIST_KEYS) if (next[key].length) sp.set(key, next[key].join(','));
    if (next.minSalary) sp.set('minSalary', next.minSalary);
    if (next.sort !== 'newest') sp.set('sort', next.sort);
    if (next.page > 1) sp.set('page', String(next.page));
    router.push(`${pathname}${sp.size ? `?${sp}` : ''}`, { scroll: false });
  };

  const toggle = (key) => (value) =>
    update({ [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value] });

  const activeCount = LIST_KEYS.reduce((n, k) => n + filters[k].length, 0) + (filters.minSalary ? 1 : 0);

  const sidebar = (
    <div className="space-y-6">
      <CheckboxGroup title="Job type" options={JOB_TYPES} selected={filters.type} onToggle={toggle('type')} />
      <CheckboxGroup title="Experience" options={JOB_LEVELS} selected={filters.level} onToggle={toggle('level')} />
      <CheckboxGroup title="Region" options={REGIONS} selected={filters.region} onToggle={toggle('region')} />
      <div>
        <label htmlFor="minSalary" className="mb-2 block text-xs font-semibold tracking-wide text-muted uppercase">Minimum salary (USD / yr)</label>
        <select id="minSalary" className="input" value={filters.minSalary} onChange={(e) => update({ minSalary: e.target.value })}>
          {SALARY_STEPS.map((s) => (
            <option key={s} value={s || ''}>{s ? `$${s / 1000}k+` : 'Any'}</option>
          ))}
        </select>
      </div>
      {meta?.popularTags?.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {meta.popularTags.map(({ tag }) => {
              const on = filters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle('tags')(tag)}
                  className={`chip transition ${on ? 'bg-brand-600 text-white' : 'hover:bg-brand-50 hover:text-brand-700'}`}
                  aria-pressed={on}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {activeCount > 0 && (
        <button className="btn-ghost w-full" onClick={() => update({ type: [], level: [], region: [], tags: [], minSalary: '' })}>
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Remote jobs</h1>
        <p className="text-muted">Search roles from remote-first companies.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: search.trim() });
        }}
        className="mb-6 flex gap-2"
      >
        <input className="input h-11 flex-1" placeholder="Search by title, skill or company" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search jobs" />
        <button className="btn-primary h-11">Search</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <button className="btn-secondary w-full lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            {showFilters ? 'Hide filters' : `Filters${activeCount ? ` (${activeCount})` : ''}`}
          </button>
          <div className={`card mt-3 p-5 lg:sticky lg:top-24 lg:mt-0 lg:block ${showFilters ? 'block' : 'hidden'}`}>{sidebar}</div>
        </aside>

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-muted">
              {data ? `${data.total} ${data.total === 1 ? 'job' : 'jobs'} found` : 'Loading jobs…'}
            </p>
            <select className="input w-auto" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort jobs">
              <option value="newest">Newest first</option>
              <option value="salary">Highest salary</option>
            </select>
          </div>

          {isError && <EmptyState title="Could not load jobs" body="Check that the API is running and try again." />}

          <div className={`space-y-3 transition-opacity ${isFetching && data ? 'opacity-60' : ''}`}>
            {!data && !isError && Array.from({ length: 5 }, (_, i) => <JobCardSkeleton key={i} />)}
            {data?.items.map((job) => <JobCard key={job._id} job={job} />)}
          </div>

          {data && data.total === 0 && (
            <EmptyState
              title="No jobs match those filters"
              body="Try removing a filter or searching for a broader term."
              action={<button className="btn-secondary" onClick={() => router.push(pathname)}>Reset search</button>}
            />
          )}

          {data && data.totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
              <button className="btn-secondary" disabled={filters.page <= 1} onClick={() => update({ page: filters.page - 1 }, { resetPage: false })}>
                Previous
              </button>
              <span className="px-3 text-sm text-muted">Page {data.page} of {data.totalPages}</span>
              <button className="btn-secondary" disabled={filters.page >= data.totalPages} onClick={() => update({ page: filters.page + 1 }, { resetPage: false })}>
                Next
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
