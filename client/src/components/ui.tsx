import type { ReactNode } from 'react';
import { label } from '@/lib/format';

export function Spinner({ className = '' }) {
  return <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 ${className}`} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
      </div>
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CompanyLogo({ name = '', url, size = 'md' }: { name?: string; url?: string; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`${name} logo`} className={`${dims} rounded-xl border border-line object-cover`} />;
  }
  const palette = ['bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700'];
  const color = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  return <div className={`${dims} ${color} grid shrink-0 place-items-center rounded-xl font-bold`}>{name.slice(0, 2).toUpperCase()}</div>;
}

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700',
  reviewing: 'bg-amber-100 text-amber-800',
  shortlisted: 'bg-brand-100 text-brand-700',
  rejected: 'bg-red-100 text-red-700',
  hired: 'bg-emerald-100 text-emerald-800',
  open: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-slate-100'}`}>{label(status)}</span>;
}

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label: text, error, hint, children, htmlFor }: FieldProps) {
  return (
    <div>
      {text && <label htmlFor={htmlFor} className="label">{text}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Alert({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div>;
}
