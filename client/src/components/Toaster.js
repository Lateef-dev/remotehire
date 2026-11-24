'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissToast } from '@/store/toastSlice';

function Toast({ toast }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const t = setTimeout(() => dispatch(dismissToast(toast.id)), 3500);
    return () => clearTimeout(t);
  }, [dispatch, toast.id]);

  const tone = toast.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <div role="status" className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${tone}`}>
      {toast.message}
    </div>
  );
}

export default function Toaster() {
  const toasts = useSelector((s) => s.toast);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
      {toasts.map((t) => <Toast key={t.id} toast={t} />)}
    </div>
  );
}
