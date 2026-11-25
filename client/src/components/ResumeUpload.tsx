'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useAppDispatch } from '@/store';
import { useRemoveResumeMutation, useUploadResumeMutation } from '@/store/api';
import { pushToast } from '@/store/toastSlice';
import { Alert } from './ui';
import { errorMessage, formatBytes, resumeFileHref, timeAgo } from '@/lib/format';
import type { User } from '@/lib/types';

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function checkFile(file: File): string | null {
  if (!/\.(pdf|docx?)$/i.test(file.name)) return 'Choose a PDF or Word document (.pdf, .doc or .docx).';
  if (file.size > MAX_BYTES) return `That file is ${formatBytes(file.size)}. The limit is 4 MB.`;
  if (file.size === 0) return 'That file is empty.';
  return null;
}

/** Upload, replace, view or remove the resume file saved on a candidate's profile. */
export default function ResumeUpload({ user }: { user: User }) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [upload, uploadState] = useUploadResumeMutation();
  const [remove, removeState] = useRemoveResumeMutation();
  const busy = uploadState.isLoading || removeState.isLoading;
  const file = user.resumeFile;

  const send = async (picked: File | undefined) => {
    if (!picked) return;
    const problem = checkFile(picked);
    setLocalError(problem);
    if (problem) return;
    try {
      await upload(picked).unwrap();
      dispatch(pushToast('Resume uploaded'));
    } catch {
      /* shown below */
    }
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    void send(e.target.files?.[0]);
    e.target.value = ''; // allow choosing the same file again
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!busy) void send(e.dataTransfer.files?.[0]);
  };

  const onRemove = async () => {
    try {
      await remove().unwrap();
      dispatch(pushToast('Resume removed'));
    } catch {
      /* shown below */
    }
  };

  const error = localError ?? ((uploadState.error || removeState.error) && errorMessage(uploadState.error ?? removeState.error));

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={onPick} aria-label="Choose resume file" tabIndex={-1} />
      <Alert>{error || null}</Alert>

      {file ? (
        <div className="@container rounded-xl border border-line p-3">
          <div className="flex flex-col gap-3 @sm:flex-row @sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700 uppercase">
                {file.name.split('.').pop()}
              </span>
              <div className="min-w-0 flex-1">
                <a href={resumeFileHref(file.fileId)} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold hover:underline" title={file.name}>
                  {file.name}
                </a>
                <p className="text-xs text-muted">{formatBytes(file.size)} · Uploaded {timeAgo(file.uploadedAt)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1 px-3 py-1.5 text-sm @sm:flex-none" disabled={busy} onClick={() => inputRef.current?.click()}>
                {uploadState.isLoading ? 'Uploading…' : 'Replace'}
              </button>
              <button type="button" className="btn-ghost flex-1 px-3 py-1.5 text-sm text-red-700 @sm:flex-none" disabled={busy} onClick={onRemove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`w-full rounded-xl border-2 border-dashed p-6 text-center transition ${dragging ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-brand-300 hover:bg-slate-50'}`}
        >
          <p className="font-semibold">{uploadState.isLoading ? 'Uploading…' : 'Upload your resume'}</p>
          <p className="mt-1 text-sm text-muted">Drag a file here or click to choose. PDF or Word, up to 4 MB.</p>
        </button>
      )}
    </div>
  );
}
