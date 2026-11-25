'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import AuthCard from '@/components/AuthCard';
import { Alert, Field } from '@/components/ui';
import { useForgotPasswordMutation } from '@/store/api';
import { errorMessage } from '@/lib/format';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading, isSuccess, error, data }] = useForgotPasswordMutation();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword({ email }).unwrap();
    } catch {
      /* shown in Alert */
    }
  };

  if (isSuccess) {
    return (
      <AuthCard title="Check your email">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p>{data?.message}</p>
          <p className="mt-2">The link expires in 30 minutes. If you don&apos;t see the email, check your spam folder.</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your account email and we'll send you a link to choose a new one.">
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error && errorMessage(error)}</Alert>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" className="input" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <button className="btn-primary w-full" disabled={isLoading}>{isLoading ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}
