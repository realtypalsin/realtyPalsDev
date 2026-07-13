import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUploadedFile } from '../uploadValidator';

test('validateUploadedFile accepts valid jpeg magic bytes', async () => {
  // Simple fake jpeg header
  const fakeJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const result = await validateUploadedFile(fakeJpeg);
  assert.equal(result.valid, true);
  assert.equal(result.mime, 'image/jpeg');
});

test('validateUploadedFile rejects dangerous exe file disguised as image', async () => {
  // Simple fake exe header "MZ"
  const fakeExe = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  const result = await validateUploadedFile(fakeExe);
  assert.equal(result.valid, false);
});
