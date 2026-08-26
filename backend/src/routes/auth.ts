import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { prisma } from '../db.js';
import type { AuthenticatedRequest } from '../types.js';
import { createEmailCode, hashEmailCode, verifyEmailCode } from '../utils/emailCode.js';
import { clearSessionCookie, publicUser, setSessionCookie } from '../utils/http.js';
import { sendRegisterCode } from '../utils/mailer.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const registerPurpose = 'register';

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[\p{Script=Han}A-Za-z0-9_-]+$/u, '用户名只能包含中文、英文、数字、下划线和短横线。'),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  code: z.string().trim().regex(/^\d{6}$/),
  avatarUrl: z.string().max(2_000_000).optional().default(''),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1).max(128),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/send-register-code', async (request, reply) => {
    const body = emailSchema.parse(request.body);
    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'EMAIL_TAKEN', message: '该邮箱已经注册。' });
    }

    const latestCode = await prisma.emailVerificationCode.findFirst({
      where: { email: body.email, purpose: registerPurpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (latestCode && latestCode.createdAt.getTime() > Date.now() - 60_000) {
      return reply.status(429).send({ error: 'TOO_FREQUENT', message: '验证码发送太频繁，请稍后再试。' });
    }

    const code = createEmailCode();
    await prisma.emailVerificationCode.create({
      data: {
        email: body.email,
        purpose: registerPurpose,
        codeHash: hashEmailCode(body.email, code, registerPurpose),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    await sendRegisterCode(body.email, code);
    return reply.send({ ok: true });
  });

  app.post('/api/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

    if (existingUser?.email === body.email) {
      return reply.status(409).send({ error: 'EMAIL_TAKEN', message: '该邮箱已经注册。' });
    }

    if (existingUser?.username === body.username) {
      return reply.status(409).send({ error: 'USERNAME_TAKEN', message: '该用户名已经被使用。' });
    }

    const verification = await prisma.emailVerificationCode.findFirst({
      where: {
        email: body.email,
        purpose: registerPurpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return reply.status(400).send({ error: 'CODE_INVALID', message: '验证码无效或已过期。' });
    }

    if (verification.attemptCount >= 5) {
      return reply.status(429).send({ error: 'CODE_LOCKED', message: '验证码尝试次数过多，请重新获取。' });
    }

    const codeMatched = verifyEmailCode(body.email, body.code, registerPurpose, verification.codeHash);
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attemptCount: { increment: 1 } },
    });

    if (!codeMatched) {
      return reply.status(400).send({ error: 'CODE_INVALID', message: '验证码错误。' });
    }

    const user = await prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.update({
        where: { id: verification.id },
        data: { consumedAt: new Date() },
      });

      return tx.user.create({
        data: {
          username: body.username,
          email: body.email,
          passwordHash: await hashPassword(body.password),
          avatarUrl: body.avatarUrl,
          emailVerifiedAt: new Date(),
        },
      });
    });

    setSessionCookie(reply, user);
    return reply.status(201).send({ user: publicUser(user) });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const identifier = body.identifier.toLowerCase();
    const user = await prisma.user.findFirst({
      where: identifier.includes('@') ? { email: identifier } : { username: body.identifier },
    });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.status(401).send({ error: 'LOGIN_FAILED', message: '用户名/邮箱或密码错误。' });
    }

    setSessionCookie(reply, user);
    return reply.send({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get('/api/auth/me', { preHandler: requireAuth }, async (request) => {
    const authRequest = request as AuthenticatedRequest;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: authRequest.user.id } });
    return { user: publicUser(user) };
  });

  app.get('/api/me', { preHandler: requireAuth }, async (request) => {
    const authRequest = request as AuthenticatedRequest;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: authRequest.user.id } });
    return { user: publicUser(user) };
  });

  app.patch('/api/me', { preHandler: requireAuth }, async (request) => {
    const authRequest = request as AuthenticatedRequest;
    const body = z
      .object({
        avatarUrl: z.string().max(2_000_000).optional(),
      })
      .parse(request.body);

    const user = await prisma.user.update({
      where: { id: authRequest.user.id },
      data: {
        avatarUrl: body.avatarUrl,
      },
    });

    return { user: publicUser(user) };
  });
}
