'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAppDispatch } from '@/store';
import { useGetMeQuery, useLogoutMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import { initials } from '@/lib/format';

function NavLink({ href, children, onClick }: { href: string; children: ReactNode; onClick?: () => void }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700' : 'text-muted hover:text-ink'}`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { data: user } = useGetMeQuery();
  const [logout] = useLogoutMutation();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    await logout();
    dispatch(pushToast('Signed out'));
    setOpen(false);
    router.push('/');
  };

  const close = () => setOpen(false);
  const links = (
    <>
      <NavLink href="/jobs" onClick={close}>Find jobs</NavLink>
      {user && <NavLink href="/dashboard" onClick={close}>Dashboard</NavLink>}
      {user?.role === 'employer' && <NavLink href="/dashboard/jobs/new" onClick={close}>Post a job</NavLink>}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">RH</span>
          <span>RemoteHire</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">{links}</div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50" title="Edit profile">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initials(user.name)}</span>
                <span className="text-sm font-medium">{user.name.split(' ')[0]}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <Link href="/register" className="btn-primary">Create account</Link>
            </>
          )}
        </div>

        <button
          className="btn-ghost md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {links}
            {user ? (
              <>
                <NavLink href="/profile" onClick={close}>Profile</NavLink>
                <button onClick={handleLogout} className="btn-secondary mt-2">Sign out</button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/login" onClick={close} className="btn-secondary">Sign in</Link>
                <Link href="/register" onClick={close} className="btn-primary">Create account</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
