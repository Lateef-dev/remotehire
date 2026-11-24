'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGetMeQuery } from '@/store/api';
import { PageLoader } from './ui';

/** Client-side guard. The API enforces every rule; this just routes people to the right place. */
export default function RequireAuth({ role, children }) {
  const { data: user, isLoading, isError } = useGetMeQuery();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (role && user.role !== role) router.replace('/dashboard');
  }, [isLoading, isError, user, role, router, pathname]);

  if (isLoading || !user || (role && user.role !== role)) return <PageLoader />;
  return typeof children === 'function' ? children(user) : children;
}
