'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useAppDispatch } from '@/store';
import { useLoginMutation, useRegisterMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import { Alert, Field } from './ui';
import { errorMessage } from '@/lib/format';

const DEMO = {
  candidate: { email: 'candidate@remotehire.dev', password: 'password123' },
  employer: { email: 'hiring@lumenpay.dev', password: 'password123' },
};

// Only allow relative redirects to avoid open-redirects via ?next=
const safeNext = (value: string | null) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard');

type Credentials = { email: string; password: string };

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    role: params.get('role') === 'employer' ? 'employer' : 'candidate',
  });
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const { isLoading, error } = isRegister ? registerState : loginState;

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e?: FormEvent, override?: Credentials) => {
    e?.preventDefault();
    try {
      if (isRegister) {
        const { companyName, ...rest } = form;
        const { user } = await register(form.role === 'employer' ? form : rest).unwrap();
        dispatch(pushToast(`Welcome to RemoteHire, ${user.name.split(' ')[0]}!`));
      } else {
        const { user } = await login(override ?? { email: form.email, password: form.password }).unwrap();
        dispatch(pushToast(`Welcome back, ${user.name.split(' ')[0]}`));
      }
      router.push(safeNext(params.get('next')));
    } catch {
      /* shown in Alert */
    }
  };

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-muted">
          {isRegister ? 'Find remote work or hire remote talent.' : 'Sign in to apply and track your applications.'}
        </p>

        <form onSubmit={(e) => submit(e)} className="mt-6 space-y-4">
          {isRegister && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Account type">
              {[
                ['candidate', "I'm looking for work"],
                ['employer', "I'm hiring"],
              ].map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={form.role === value}
                  onClick={() => setForm((f) => ({ ...f, role: value }))}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${form.role === value ? 'bg-white shadow-sm' : 'text-muted'}`}
                >
                  {text}
                </button>
              ))}
            </div>
          )}

          <Alert>{error && errorMessage(error)}</Alert>

          {isRegister && (
            <Field label="Full name" htmlFor="name">
              <input id="name" className="input" required minLength={2} autoComplete="name" value={form.name} onChange={set('name')} />
            </Field>
          )}
          {isRegister && form.role === 'employer' && (
            <Field label="Company name" htmlFor="companyName">
              <input id="companyName" className="input" required minLength={2} autoComplete="organization" value={form.companyName} onChange={set('companyName')} />
            </Field>
          )}
          <Field label="Email" htmlFor="email">
            <input id="email" type="email" className="input" required autoComplete="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Password" htmlFor="password" hint={isRegister ? 'At least 8 characters.' : undefined}>
            <input
              id="password"
              type="password"
              className="input"
              required
              minLength={isRegister ? 8 : 1}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={set('password')}
            />
          </Field>
          {!isRegister && (
            <div className="-mt-2 text-right">
              <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          <button className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {!isRegister && (
          <div className="mt-6 rounded-xl border border-dashed border-line p-4">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Try the demo</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" disabled={isLoading} onClick={() => submit(undefined, DEMO.candidate)}>As candidate</button>
              <button type="button" className="btn-secondary" disabled={isLoading} onClick={() => submit(undefined, DEMO.employer)}>As employer</button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? 'Already have an account? ' : 'New to RemoteHire? '}
          <Link href={isRegister ? '/login' : '/register'} className="font-semibold text-brand-700 hover:underline">
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}
