// Local image persistence (research §6). Picker/camera URIs point at the OS cache,
// which can be evicted; copy anything referenced by a saved record into the app's
// document directory so it survives restarts. Delete on order cancel / draft discard.
//
// Uses the SDK 56 File/Directory/Paths API (the classic `FileSystem.*` helpers moved
// to expo-file-system/legacy).

import { Directory, File, Paths } from 'expo-file-system';

import { uuid } from '@/lib/id';

/** The app's persistent images directory, created on first use. */
function imagesDir(): Directory {
  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create();
  return dir;
}

/** Copy a picked/captured image into the document directory; return the new URI. */
export async function persistImage(sourceUri: string): Promise<string> {
  const dir = imagesDir();
  const ext = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const dest = new File(dir, `${uuid()}.${ext}`);
  await new File(sourceUri).copy(dest);
  return dest.uri;
}

/** Best-effort delete of a previously persisted image. Never throws. */
export async function deleteImage(uri?: string): Promise<void> {
  if (!uri || !uri.includes('/images/')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup — a missing file is not an error worth surfacing.
  }
}
