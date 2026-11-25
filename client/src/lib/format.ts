import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { ApiErrorBody, SalaryFields } from './types';

const LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead',
  worldwide: 'Worldwide',
  africa: 'Africa',
  europe: 'Europe',
  americas: 'Americas',
  'asia-pacific': 'Asia-Pacific',
  emea: 'EMEA',
  submitted: 'Submitted',
  reviewing: 'In review',
  shortlisted: 'Shortlisted',
  rejected: 'Not selected',
  hired: 'Hired',
  open: 'Open',
  closed: 'Closed',
};

export const label = (value: string): string => LABELS[value] ?? value;

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };

export function formatSalary({ salaryMin, salaryMax, currency = 'USD' }: SalaryFields): string | null {
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  if (salaryMin && salaryMax) return `${symbol}${compact(salaryMin)} – ${symbol}${compact(salaryMax)}`;
  if (salaryMax) return `Up to ${symbol}${compact(salaryMax)}`;
  if (salaryMin) return `From ${symbol}${compact(salaryMin)}`;
  return null;
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const units: [string, number][] = [
    ['y', 31536000],
    ['mo', 2592000],
    ['w', 604800],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ];
  for (const [unit, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${unit} ago`;
  }
  return 'just now';
}

export type RequestError = FetchBaseQueryError | SerializedError | undefined;

export function errorMessage(error: RequestError | unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (error as { data?: Partial<ApiErrorBody> } | undefined)?.data?.error;
  if (!data) return fallback;
  if (data.details?.length) return data.details.map((d) => `${d.path ? `${d.path}: ` : ''}${d.message}`).join(' · ');
  return data.message ?? fallback;
}

export const initials = (name = ''): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Uploaded resumes are served by the API behind the same /api proxy, so the session cookie applies. */
export const resumeFileHref = (fileId: string) => `/api/resumes/${fileId}`;
