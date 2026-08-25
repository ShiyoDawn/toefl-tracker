import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';
import type { AuthUser } from '../types.js';

type SessionPayload = AuthUser & {
  exp: number;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
  return createHmac('sha256', env.JWT_SECRET).update(value).digest('base64url');
}

export function createSessionToken(user: AuthUser) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      ...user,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    } satisfies SessionPayload),
  );
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const unsigned = `${header}.${payload}`;
  const expected = sign(unsigned);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<SessionPayload>;
    if (!parsed.id || !parsed.username || !parsed.email || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: parsed.id, username: parsed.username, email: parsed.email };
  } catch {
    return null;
  }
}
