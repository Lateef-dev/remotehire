import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';
import { PageLoader } from '@/components/ui';

export const metadata = { title: 'Sign in' };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
