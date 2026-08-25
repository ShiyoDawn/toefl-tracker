import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';

export function createEmailCode() {
  return randomInt(100000, 1000000).toString();
}

export function hashEmailCode(email: string, code: string, purpose: string) {
  return createHmac('sha256', env.EMAIL_CODE_SECRET)
    .update(`${purpose}:${email.trim().toLowerCase()}:${code}`)
    .digest('hex');
}

export function verifyEmailCode(email: string, code: string, purpose: string, storedHash: string) {
  const provided = Buffer.from(hashEmailCode(email, code, purpose));
  const stored = Buffer.from(storedHash);
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}
