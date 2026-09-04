export function isPublicSignupRequest(method: string, path: string): boolean {
  return method.toUpperCase() === 'POST' && path === '/auth/email/signup';
}

export function isS3KeyOwnedByUser(userId: string, s3Key: string): boolean {
  const prefix = `${userId}/`;
  return s3Key.startsWith(prefix) && s3Key.length > prefix.length;
}
