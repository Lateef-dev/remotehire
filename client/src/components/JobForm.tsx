'use client';

import { useState, type ChangeEvent } from 'react';
import { Alert, Field } from './ui';
import { JOB_LEVELS, JOB_TYPES, REGIONS } from '@/lib/constants';
import { errorMessage, label, type RequestError } from '@/lib/format';
import type { Job, JobInput, JobLevel, JobStatus, JobType, Region } from '@/lib/types';

interface JobFormState {
  title: string;
  type: JobType;
  level: JobLevel;
  region: Region;
  timezone: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  tags: string;
  requirements: string;
  description: string;
  status: JobStatus;
}

type SelectKey = 'type' | 'level' | 'region';

const toForm = (job: Partial<Job> = {}): JobFormState => ({
  title: job.title ?? '',
  type: job.type ?? 'full-time',
  level: job.level ?? 'mid',
  region: job.region ?? 'worldwide',
  timezone: job.timezone ?? '',
  salaryMin: job.salaryMin?.toString() ?? '',
  salaryMax: job.salaryMax?.toString() ?? '',
  currency: job.currency ?? 'USD',
  tags: job.tags?.join(', ') ?? '',
  requirements: job.requirements?.join('\n') ?? '',
  description: job.description ?? '',
  status: job.status ?? 'open',
});

function toPayload(form: JobFormState, isEdit: boolean): JobInput {
  const num = (v: string) => (v === '' ? undefined : Number(v));
  return {
    title: form.title.trim(),
    type: form.type,
    level: form.level,
    region: form.region,
    timezone: form.timezone.trim() || undefined,
    salaryMin: num(form.salaryMin),
    salaryMax: num(form.salaryMax),
    currency: form.currency,
    tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    requirements: form.requirements.split('\n').map((r) => r.trim()).filter(Boolean),
    description: form.description.trim(),
    ...(isEdit && { status: form.status }),
  };
}

interface JobFormProps {
  job?: Job;
  onSubmit: (payload: JobInput) => void;
  isLoading: boolean;
  error?: RequestError;
  submitLabel: string;
}

export default function JobForm({ job, onSubmit, isLoading, error, submitLabel }: JobFormProps) {
  const isEdit = !!job;
  const [form, setForm] = useState(() => toForm(job));
  const set = (key: keyof JobFormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const select = (key: SelectKey, options: readonly string[]) => (
    <select id={key} className="input" value={form[key]} onChange={set(key)}>
      {options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
    </select>
  );

  return (
    <form
      className="card space-y-5 p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(toPayload(form, isEdit));
      }}
    >
      <Alert>{error && errorMessage(error)}</Alert>

      <Field label="Job title" htmlFor="title">
        <input id="title" className="input" required minLength={3} maxLength={120} placeholder="e.g. Senior React Engineer" value={form.title} onChange={set('title')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Job type" htmlFor="type">{select('type', JOB_TYPES)}</Field>
        <Field label="Level" htmlFor="level">{select('level', JOB_LEVELS)}</Field>
        <Field label="Hiring region" htmlFor="region">{select('region', REGIONS)}</Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
        <Field label="Salary from (yearly)" htmlFor="salaryMin">
          <input id="salaryMin" type="number" min={0} step={1000} className="input" placeholder="40000" value={form.salaryMin} onChange={set('salaryMin')} />
        </Field>
        <Field label="Salary to (yearly)" htmlFor="salaryMax">
          <input id="salaryMax" type="number" min={0} step={1000} className="input" placeholder="60000" value={form.salaryMax} onChange={set('salaryMax')} />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <select id="currency" className="input" value={form.currency} onChange={set('currency')}>
            {['USD', 'EUR', 'GBP', 'NGN'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Skills / tags" htmlFor="tags" hint="Comma separated, e.g. react, next.js, tailwind">
          <input id="tags" className="input" value={form.tags} onChange={set('tags')} />
        </Field>
        <Field label="Time zone overlap (optional)" htmlFor="timezone" hint="e.g. UTC-1 to UTC+3">
          <input id="timezone" className="input" value={form.timezone} onChange={set('timezone')} />
        </Field>
      </div>

      <Field label="Description" htmlFor="description" hint="What the team does, what the person will own, and what you offer.">
        <textarea id="description" required minLength={30} rows={8} className="input" value={form.description} onChange={set('description')} />
      </Field>

      <Field label="Requirements" htmlFor="requirements" hint="One per line.">
        <textarea id="requirements" rows={4} className="input" value={form.requirements} onChange={set('requirements')} />
      </Field>

      {isEdit && (
        <Field label="Status" htmlFor="status">
          <select id="status" className="input" value={form.status} onChange={set('status')}>
            <option value="open">Open, accepting applications</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
      )}

      <div className="flex justify-end">
        <button className="btn-primary" disabled={isLoading}>{isLoading ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
