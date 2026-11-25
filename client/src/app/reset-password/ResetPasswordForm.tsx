'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import AuthCard from '@/components/AuthCard';
import { Alert, Field } from '@/components/ui';
import { useResetPasswordMutation } from '@/store/api';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/toastSlice';
import { errorMessage } from '@/lib/format';

export default function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthCard title="This link doesn't work" subtitle="The reset link is incomplete or has been changed. Request a new one and use the link from the latest email.">
        <Link href="/forgot-password" className="btn-primary w-full">Request a new link</Link>
      </AuthCard>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    try {
      await resetPassword({ token, password }).unwrap();
      dispatch(pushToast('Password updated. You are signed in.'));
      router.replace('/dashboard');
    } catch {
      /* shown in Alert */
    }
  };

  const expired = !!error && 'status' in error && error.status === 400;

  return (
    <AuthCard title="Choose a new password" subtitle="Use at least 8 characters. You'll be signed out on your other devices.">
      <form onSubmit={submit} className="space-y-4">
        <Alert>
          {error && (
            <>
              {errorMessage(error)}{' '}
              {expired && <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>}
            </>
          )}
        </Alert>
        <Field label="New password" htmlFor="password">
          <input id="password" type="password" className="input" required minLength={8} autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" error={mismatch ? 'The passwords do not match' : undefined}>
          <input
            id="confirm"
            type="password"
            className="input"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setMismatch(false);
            }}
          />
        </Field>
        <button className="btn-primary w-full" disabled={isLoading}>{isLoading ? 'Saving…' : 'Update password'}</button>
      </form>
    </AuthCard>
  );
}
