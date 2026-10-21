// Checks and cleans a photo before it is stored (security guide, section 7).
// The file type is read from the file's bytes, not its name. Re-encoding through a canvas
// drops EXIF, GPS and device metadata, and applies the EXIF orientation first.
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export type RejectionReason = 'unsupported' | 'tooLarge' | 'unreadable';

export class PhotoRejectedError extends Error {
  constructor(readonly reason: RejectionReason) {
    super(reason);
    this.name = 'PhotoRejectedError';
  }
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50];

function matchesAt(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  return expected.every((byte, index) => bytes[offset + index] === byte);
}

export async function isSupportedPhoto(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return (
    matchesAt(head, 0, JPEG_SIGNATURE) ||
    matchesAt(head, 0, PNG_SIGNATURE) ||
    (matchesAt(head, 0, RIFF_SIGNATURE) && matchesAt(head, 8, WEBP_TAG))
  );
}

export async function preparePhoto(file: File): Promise<Blob> {
  if (!(await isSupportedPhoto(file))) {
    throw new PhotoRejectedError('unsupported');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new PhotoRejectedError('tooLarge');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoRejectedError('unreadable');
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new PhotoRejectedError('unreadable');
    }
    // JPEG has no transparency, so transparent pixels are flattened onto white.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (!blob) {
      throw new PhotoRejectedError('unreadable');
    }
    return blob;
  } finally {
    bitmap.close();
  }
}
