/**
 * Validate user-supplied signature payload (base64 data URI from canvas).
 * Returns null if valid, or { status, error } if invalid.
 * null/undefined/empty string is considered "no signature" — valid (signature is optional).
 */
export function validateSignature(signature) {
  if (signature === undefined || signature === null || signature === '') return null;
  if (typeof signature !== 'string') {
    return { status: 400, error: 'Signature must be a string.' };
  }
  if (!signature.startsWith('data:image/png;base64,') && !signature.startsWith('data:image/jpeg;base64,')) {
    return { status: 400, error: 'Signature must be a base64 PNG/JPEG data URI.' };
  }
  if (signature.length > 200_000) {
    return { status: 400, error: 'Signature too large (max ~200KB).' };
  }
  return null;
}
