import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted">The page you are looking for does not exist.</p>
        <Link href="/jobs" className="btn-primary mt-6">Browse remote jobs</Link>
      </div>
    </div>
  );
}
