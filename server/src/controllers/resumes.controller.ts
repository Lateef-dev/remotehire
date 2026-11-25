import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Application, User } from '../models/index.ts';
import { ApiError } from '../utils/ApiError.ts';
import { currentUser } from '../middleware/auth.ts';
import {
  cleanFileName,
  deleteResumeFile,
  detectResumeType,
  findResumeFile,
  openResumeFile,
  saveResumeFile,
} from '../utils/resumeStorage.ts';

/** Delete a stored file once neither a profile nor an application points at it. */
export async function deleteResumeIfUnused(fileId: Types.ObjectId) {
  const [onProfile, onApplication] = await Promise.all([
    User.exists({ 'resumeFile.fileId': fileId }),
    Application.exists({ 'resumeFile.fileId': fileId }),
  ]);
  if (!onProfile && !onApplication) await deleteResumeFile(fileId);
}

export async function uploadResume(req: Request, res: Response) {
  const user = currentUser(req);
  const data = req.body;
  if (!Buffer.isBuffer(data) || data.length === 0) throw ApiError.badRequest('Choose a file to upload');

  const declared = (req.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const type = detectResumeType(data, declared);
  if (!type) throw ApiError.badRequest('Upload a PDF or Word document (.pdf, .doc or .docx)');

  const name = cleanFileName(req.get('x-file-name'), type.ext);
  const fileId = await saveResumeFile(data, { name, contentType: type.contentType, owner: user._id });

  const previous = user.resumeFile?.fileId;
  user.resumeFile = { fileId, name, size: data.length, contentType: type.contentType, uploadedAt: new Date() };
  await user.save();
  if (previous) await deleteResumeIfUnused(previous);

  res.status(201).json({ user });
}

export async function removeResume(req: Request, res: Response) {
  const user = currentUser(req);
  const previous = user.resumeFile?.fileId;
  user.resumeFile = undefined;
  await user.save();
  if (previous) await deleteResumeIfUnused(previous);
  res.json({ user });
}

/** Download a resume: allowed for its owner and for employers who received it in an application. */
export async function downloadResume(req: Request<{ fileId: string }>, res: Response) {
  if (!Types.ObjectId.isValid(req.params.fileId)) throw ApiError.notFound('Resume not found');
  const fileId = new Types.ObjectId(req.params.fileId);
  const user = currentUser(req);

  const file = await findResumeFile(fileId);
  if (!file) throw ApiError.notFound('Resume not found');

  const isOwner = user._id.equals(file.metadata?.owner);
  const isEmployer = !isOwner && (await Application.exists({ 'resumeFile.fileId': fileId, employer: user._id }));
  // 404 rather than 403 so file ids can't be probed.
  if (!isOwner && !isEmployer) throw ApiError.notFound('Resume not found');

  const contentType: string = file.metadata?.contentType ?? 'application/octet-stream';
  const disposition = contentType === 'application/pdf' ? 'inline' : 'attachment';
  res.set({
    'Content-Type': contentType,
    'Content-Length': String(file.length),
    'Content-Disposition': `${disposition}; filename="resume.${file.filename.split('.').pop()}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    'Cache-Control': 'private, no-store',
  });
  openResumeFile(fileId)
    .on('error', () => res.destroy())
    .pipe(res);
}
