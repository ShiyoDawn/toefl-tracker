import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db.js';
import { env } from './env.js';
import type { AuthUser, AuthenticatedRequest } from './types.js';
import { verifySessionToken } from './utils/tokens.js';

export async function getAuthUser(request: FastifyRequest): Promise<AuthUser | null> {
  const token = request.cookies[env.COOKIE_NAME];
  if (!token) return null;

  const sessionUser = verifySessionToken(token);
  if (!sessionUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, username: true, email: true },
  });

  return user;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = await getAuthUser(request);
  if (!user) {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: '请先登录。' });
  }

  (request as AuthenticatedRequest).user = user;
}
