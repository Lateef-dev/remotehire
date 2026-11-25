import mongoose, { Types } from 'mongoose';
import { Readable } from 'node:stream';

/** Resumes are stored in MongoDB GridFS, so no extra storage service is needed. */
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

const TYPES = {
  pdf: { contentType: 'application/pdf', ext: 'pdf' },
  doc: { contentType: 'application/msword', ext: 'doc' },
  docx: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
} as const;

export const RESUME_CONTENT_TYPES = Object.values(TYPES).map((t) => t.contentType);

/** Detect the real file type from its first bytes rather than trusting the client. */
export function detectResumeType(buf: Buffer, declared: string) {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return TYPES.pdf;
  if (buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return TYPES.doc;
  // .docx is a zip; only accept it when the client also says it's a Word document.
  if (buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && declared === TYPES.docx.contentType) return TYPES.docx;
  return null;
}

/** Keep file names short and free of path or header-breaking characters. */
export function cleanFileName(raw: string | undefined, ext: string) {
  let name = 'resume';
  try {
    name = decodeURIComponent(raw ?? '') || name;
  } catch {
    /* keep default */
  }
  name = name.replace(/[\\/:*?"<>|\r\n\t]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'resume';
  const base = name.replace(/\.[a-z0-9]{1,5}$/i, '') || 'resume';
  return `${base}.${ext}`;
}

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: 'resumes' });

export async function saveResumeFile(data: Buffer, opts: { name: string; contentType: string; owner: Types.ObjectId }) {
  const upload = bucket().openUploadStream(opts.name, { metadata: { owner: opts.owner, contentType: opts.contentType } });
  await new Promise<void>((resolve, reject) => {
    Readable.from([data]).pipe(upload).on('finish', () => resolve()).on('error', reject);
  });
  return upload.id as Types.ObjectId;
}

export async function findResumeFile(id: Types.ObjectId) {
  const [file] = await bucket().find({ _id: id }).limit(1).toArray();
  return file;
}

export const openResumeFile = (id: Types.ObjectId) => bucket().openDownloadStream(id);

export async function deleteResumeFile(id: Types.ObjectId) {
  try {
    await bucket().delete(id);
  } catch {
    /* already gone */
  }
}
