export function isPublicSignupRequest(method, path) {
    return method.toUpperCase() === 'POST' && path === '/auth/email/signup';
}
export function isS3KeyOwnedByUser(userId, s3Key) {
    const prefix = `${userId}/`;
    return s3Key.startsWith(prefix) && s3Key.length > prefix.length;
}
//# sourceMappingURL=policies.js.map