'use client';

import { useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react';
import { useAppDispatch } from '@/store';
import RequireAuth from '@/components/RequireAuth';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { Alert, Field } from '@/components/ui';
import { useUpdateProfileMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import { errorMessage } from '@/lib/format';
import type { ProfileInput, User } from '@/lib/types';

function ProfileForm({ user }: { user: User }) {
  const isEmployer = user.role === 'employer';
  const [form, setForm] = useState({
    name: user.name ?? '',
    headline: user.headline ?? '',
    location: user.location ?? '',
    skills: user.skills?.join(', ') ?? '',
    resumeUrl: user.resumeUrl ?? '',
    portfolioUrl: user.portfolioUrl ?? '',
    bio: user.bio ?? '',
    companyName: user.company?.name ?? '',
    website: user.company?.website ?? '',
    logoUrl: user.company?.logoUrl ?? '',
    about: user.company?.about ?? '',
  });
  const [update, { isLoading, error }] = useUpdateProfileMutation();
  const dispatch = useAppDispatch();
  type FormKey = keyof typeof form;
  const set = (key: FormKey) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload: ProfileInput = isEmployer
      ? { name: form.name, company: { name: form.companyName, website: form.website, logoUrl: form.logoUrl, about: form.about } }
      : {
          name: form.name,
          headline: form.headline,
          location: form.location,
          skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
          resumeUrl: form.resumeUrl,
          portfolioUrl: form.portfolioUrl,
          bio: form.bio,
        };
    try {
      await update(payload).unwrap();
      dispatch(pushToast('Profile saved'));
    } catch {
      /* shown in Alert */
    }
  };

  const input = (key: FormKey, props: InputHTMLAttributes<HTMLInputElement> = {}) => <input id={key} className="input" value={form[key]} onChange={set(key)} {...props} />;

  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="text-3xl font-bold tracking-tight">{isEmployer ? 'Company profile' : 'Your profile'}</h1>
      <p className="mb-6 text-muted">{isEmployer ? 'Candidates see this on every job you post.' : 'Employers see this when you apply.'}</p>

      <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
        <Alert>{error && errorMessage(error)}</Alert>
        <Field label="Your name" htmlFor="name">{input('name', { required: true, minLength: 2 })}</Field>

        {isEmployer ? (
          <>
            <Field label="Company name" htmlFor="companyName">{input('companyName', { required: true, minLength: 2 })}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website" htmlFor="website">{input('website', { type: 'url', placeholder: 'https://…' })}</Field>
              <Field label="Logo URL" htmlFor="logoUrl" hint="A square image works best.">{input('logoUrl', { type: 'url', placeholder: 'https://…' })}</Field>
            </div>
            <Field label="About the company" htmlFor="about">
              <textarea id="about" rows={5} className="input" value={form.about} onChange={set('about')} />
            </Field>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Headline" htmlFor="headline">{input('headline', { placeholder: 'Frontend Engineer (React, Next.js)' })}</Field>
              <Field label="Location" htmlFor="location">{input('location', { placeholder: 'Lagos, Nigeria' })}</Field>
            </div>
            <Field label="Skills" htmlFor="skills" hint="Comma separated.">{input('skills', { placeholder: 'react, next.js, tailwind' })}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Resume link" htmlFor="resumeUrl" hint="Used by default when you apply.">{input('resumeUrl', { type: 'url', placeholder: 'https://…' })}</Field>
              <Field label="Portfolio / GitHub" htmlFor="portfolioUrl">{input('portfolioUrl', { type: 'url', placeholder: 'https://…' })}</Field>
            </div>
            <Field label="Short bio" htmlFor="bio">
              <textarea id="bio" rows={4} className="input" value={form.bio} onChange={set('bio')} />
            </Field>
          </>
        )}

        <div className="flex justify-end">
          <button className="btn-primary" disabled={isLoading}>{isLoading ? 'Saving…' : 'Save profile'}</button>
        </div>
      </form>

      <ChangePasswordForm />
    </div>
  );
}

export default function ProfilePage() {
  return <RequireAuth>{(user) => <ProfileForm user={user} />}</RequireAuth>;
}
