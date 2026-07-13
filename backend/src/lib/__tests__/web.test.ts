import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeUrl } from '../web'; // Need to export it in web.ts for testing if not already

test('isSafeUrl allows external https sites', () => {
  assert.equal(isSafeUrl('https://example.com/some/path'), true);
  assert.equal(isSafeUrl('https://google.com'), true);
});

test('isSafeUrl blocks http completely', () => {
  assert.equal(isSafeUrl('http://example.com'), false);
});

test('isSafeUrl blocks localhost', () => {
  assert.equal(isSafeUrl('https://localhost'), false);
  assert.equal(isSafeUrl('https://127.0.0.1'), false);
  assert.equal(isSafeUrl('https://0.0.0.0'), false);
});

test('isSafeUrl blocks AWS and GCP metadata endpoints', () => {
  assert.equal(isSafeUrl('https://169.254.169.254/latest/meta-data'), false);
  assert.equal(isSafeUrl('https://metadata.google.internal'), false);
});

test('isSafeUrl blocks private IP ranges', () => {
  assert.equal(isSafeUrl('https://10.0.0.5/api'), false);
  assert.equal(isSafeUrl('https://192.168.1.100'), false);
  assert.equal(isSafeUrl('https://172.16.5.5'), false);
});
