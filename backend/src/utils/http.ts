import type { FastifyReply } from 'fastify';
import { env } from '../env.js';
import type { AuthUser } from '../types.js';
import { createSessionToken } from './tokens.js';

export function publicUser(user: AuthUser & { avatarUrl?: string | null; emailVerifiedAt?: Date | null }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? '',
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export function setSessionCookie(reply: FastifyReply, user: AuthUser) {
  reply.setCookie(env.COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(env.COOKIE_NAME, {
    path: '/',
  });
}
