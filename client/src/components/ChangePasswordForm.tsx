'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Alert, Field } from './ui';
import { useChangePasswordMutation } from '@/store/api';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/toastSlice';
import { errorMessage } from '@/lib/format';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY);
  const [mismatch, setMismatch] = useState(false);
  const [changePassword, { isLoading, error, reset }] = useChangePasswordMutation();
  const dispatch = useAppDispatch();

  const set = (key: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setMismatch(false);
    reset();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setMismatch(true);
      return;
    }
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }).unwrap();
      setForm(EMPTY);
      dispatch(pushToast('Password changed. Other devices have been signed out.'));
    } catch {
      /* shown in Alert */
    }
  };

  return (
    <form onSubmit={submit} className="card mt-6 space-y-5 p-6 sm:p-8">
      <div>
        <h2 className="text-lg font-semibold">Change password</h2>
        <p className="text-sm text-muted">You&apos;ll stay signed in here and be signed out everywhere else.</p>
      </div>
      <Alert>{error && errorMessage(error)}</Alert>
      <Field label="Current password" htmlFor="currentPassword">
        <input id="currentPassword" type="password" className="input" required autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
          <input id="newPassword" type="password" className="input" required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={mismatch ? 'The passwords do not match' : undefined}>
          <input id="confirmPassword" type="password" className="input" required minLength={8} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </Field>
      </div>
      <div className="flex justify-end">
        <button className="btn-secondary" disabled={isLoading}>{isLoading ? 'Saving…' : 'Change password'}</button>
      </div>
    </form>
  );
}
