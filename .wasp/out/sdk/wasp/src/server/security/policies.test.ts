import { expect, test } from 'vitest';
import { isPublicSignupRequest, isS3KeyOwnedByUser } from './policies';

test('only blocks the public email signup POST', () => {
  expect(isPublicSignupRequest('POST', '/auth/email/signup')).toBe(true);
  expect(isPublicSignupRequest('GET', '/auth/email/signup')).toBe(false);
  expect(isPublicSignupRequest('POST', '/auth/email/login')).toBe(false);
});

test('requires the user id plus a path separator for an S3 key', () => {
  expect(isS3KeyOwnedByUser('12', '12/uuid.png')).toBe(true);
  expect(isS3KeyOwnedByUser('12', '123/uuid.png')).toBe(false);
  expect(isS3KeyOwnedByUser('12', '12')).toBe(false);
});
