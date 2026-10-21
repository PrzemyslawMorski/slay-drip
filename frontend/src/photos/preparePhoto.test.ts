import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTO_BYTES,
  PhotoRejectedError,
  isSupportedPhoto,
  preparePhoto,
} from './preparePhoto';

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
const WAVE_HEADER = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45];
const GIF_HEADER = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const TEXT = new TextEncoder().encode('Dear diary, this is not a photo.');

function fileOf(bytes: number[] | Uint8Array, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('isSupportedPhoto', () => {
  it.each([
    ['JPEG', JPEG_HEADER],
    ['PNG', PNG_HEADER],
    ['WebP', WEBP_HEADER],
  ])('accepts a %s by its bytes', async (_format, header) => {
    expect(await isSupportedPhoto(fileOf(header, 'photo', ''))).toBe(true);
  });

  it('rejects a GIF', async () => {
    expect(await isSupportedPhoto(fileOf(GIF_HEADER, 'photo.gif', 'image/gif'))).toBe(false);
  });

  it('rejects a RIFF file that is not WebP', async () => {
    expect(await isSupportedPhoto(fileOf(WAVE_HEADER, 'sound.webp', 'image/webp'))).toBe(false);
  });

  it('rejects text renamed to .jpg, because the type comes from the bytes', async () => {
    expect(await isSupportedPhoto(fileOf(TEXT, 'diary.jpg', 'image/jpeg'))).toBe(false);
  });

  it('rejects a file too short to hold a signature', async () => {
    expect(await isSupportedPhoto(fileOf([0xff, 0xd8], 'tiny.jpg', 'image/jpeg'))).toBe(false);
  });
});

describe('preparePhoto', () => {
  it('rejects an unsupported file before reading its size or decoding it', async () => {
    const rejection = preparePhoto(fileOf(TEXT, 'diary.jpg', 'image/jpeg'));

    await expect(rejection).rejects.toBeInstanceOf(PhotoRejectedError);
    await expect(rejection).rejects.toMatchObject({ reason: 'unsupported' });
  });

  it('rejects a supported file over the size limit', async () => {
    const oversized = new Uint8Array(MAX_PHOTO_BYTES + 1);
    oversized.set(JPEG_HEADER);

    const rejection = preparePhoto(fileOf(oversized, 'huge.jpg', 'image/jpeg'));

    await expect(rejection).rejects.toBeInstanceOf(PhotoRejectedError);
    await expect(rejection).rejects.toMatchObject({ reason: 'tooLarge' });
  });
});
