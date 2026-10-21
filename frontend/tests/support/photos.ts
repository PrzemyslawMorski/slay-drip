// Synthetic test photos, generated during the run. No real photos are stored in the repo.
import type { Page } from '@playwright/test';
import { MAX_PHOTO_BYTES } from '../../src/photos/preparePhoto';

export type PhotoFormat = 'JPEG' | 'PNG' | 'WebP';

const MIME_TYPES: Record<PhotoFormat, string> = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WebP: 'image/webp',
};

export interface PhotoFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

// Draws a plain colour block in the browser and encodes it in the requested format.
export async function renderSamplePhoto(
  page: Page,
  format: PhotoFormat,
  seed = 0,
): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ mimeType, seed }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 400;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('This browser has no 2D canvas context');
      }
      context.fillStyle = `hsl(${(seed * 97) % 360} 60% 55%)`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error(`Canvas could not encode ${mimeType}`));
            }
          },
          mimeType,
          0.9,
        ),
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
      return btoa(binary);
    },
    { mimeType: MIME_TYPES[format], seed },
  );
  return Buffer.from(base64, 'base64');
}

export async function samplePhotoFile(
  page: Page,
  format: PhotoFormat,
  seed = 0,
): Promise<PhotoFile> {
  return {
    name: `item-${seed}.${format.toLowerCase() === 'jpeg' ? 'jpg' : format.toLowerCase()}`,
    mimeType: MIME_TYPES[format],
    buffer: await renderSamplePhoto(page, format, seed),
  };
}

// Inserts an APP1 (Exif) segment after the JPEG start marker, with fake location and device details.
export function withLocationAndDeviceDetails(jpeg: Buffer): Buffer {
  const payload = Buffer.from(
    'Exif\0\0Make=TestCamera;GPSLatitude=52.2297;GPSLongitude=21.0122',
    'latin1',
  );
  const segmentLength = payload.length + 2;
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1, segmentLength >> 8, segmentLength & 0xff]),
    payload,
  ]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

// Starts with a JPEG signature and is one byte over the limit.
export function oversizedJpeg(): Buffer {
  const buffer = Buffer.alloc(MAX_PHOTO_BYTES + 1);
  buffer.set([0xff, 0xd8, 0xff]);
  return buffer;
}

// Plain text with a .jpg name: not an image.
export function notAPhoto(): Buffer {
  return Buffer.from('%PDF-1.4\n% synthetic test file, not an image\n', 'latin1');
}
