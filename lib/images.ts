// Local image persistence (research §6, revised for web/PWA support). Picker/camera
// URIs point at OS cache or a browser blob URL, either of which can be evicted; on
// native we copy into the app's document directory (SDK 56 File/Directory/Paths
// API), on web there's no real filesystem so we inline the image as a data URL,
// which is self-contained and survives in AsyncStorage across reloads.

import { Platform } from 'react-native';

import { uuid } from '@/lib/id';

/** The app's persistent images directory, created on first use (native only). */
function imagesDir() {
  // Lazy require: expo-file-system's native Directory/Paths classes throw if
  // touched on web, so this path must never be evaluated there.
  const { Directory, Paths } = require('expo-file-system');
  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create();
  return dir;
}

/** Copy a picked/captured image into permanent storage; return its persisted URI. */
export async function persistImage(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') return uriToDataUrl(sourceUri);

  const { File } = require('expo-file-system');
  const dir = imagesDir();
  const ext = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const dest = new File(dir, `${uuid()}.${ext}`);
  await new File(sourceUri).copy(dest);
  return dest.uri;
}

/** Best-effort delete of a previously persisted image. Never throws. No-op on web. */
export async function deleteImage(uri?: string): Promise<void> {
  if (!uri || Platform.OS === 'web' || !uri.includes('/images/')) return;
  try {
    const { File } = require('expo-file-system');
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup — a missing file is not an error worth surfacing.
  }
}

function uriToDataUrl(uri: string): Promise<string> {
  return fetch(uri)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}

/**
 * Resolve any persisted image URI (data URL or native file URI) to raw base64 +
 * media type, for sending as a Claude multimodal image content block.
 */
export async function imageToBase64(uri: string): Promise<{ base64: string; mediaType: string }> {
  const dataUrl = uri.startsWith('data:') ? uri : await uriToDataUrl(uri);
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Could not read image data');
  return { mediaType: match[1], base64: match[2] };
}
