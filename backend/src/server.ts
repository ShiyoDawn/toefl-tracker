import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { prisma } from './db.js';
import { env } from './env.js';
import { attemptRoutes } from './routes/attempts.js';
import { authRoutes } from './routes/auth.js';

const app = Fastify({
  logger: true,
});

await app.register(cookie);

await app.register(cors, {
  origin: env.FRONTEND_ORIGIN ? [env.FRONTEND_ORIGIN] : true,
  credentials: true,
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: '请求参数不正确。',
      issues: error.issues,
    });
  }

  app.log.error(error);
  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: '服务器内部错误。',
  });
});

app.get('/api/health', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true };
});

await app.register(authRoutes);
await app.register(attemptRoutes);

const close = async () => {
  await app.close();
  await prisma.$disconnect();
};

process.on('SIGINT', () => {
  close().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  close().finally(() => process.exit(0));
});

await app.listen({ host: env.HOST, port: env.PORT });
