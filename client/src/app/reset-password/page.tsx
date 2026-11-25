import { Suspense } from 'react';
import type { Metadata } from 'next';
import ResetPasswordForm from './ResetPasswordForm';
import { PageLoader } from '@/components/ui';

export const metadata: Metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
