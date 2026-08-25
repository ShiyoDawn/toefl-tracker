import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { prisma } from '../db.js';
import type { AuthenticatedRequest } from '../types.js';

const sectionSchema = z.enum(['Reading', 'Listening', 'Speaking', 'Writing']);
const scoreValueSchema = z.union([z.number().min(0).max(30), z.literal('')]);

const attemptInputSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  path: z.enum(['Router + Upper', 'Router + Lower', 'Mixed practice']),
  values: z.record(z.string(), scoreValueSchema),
  readingCounts: z.record(z.string(), z.number().int().min(1).max(20)).optional().default({}),
  official: z.partialRecord(sectionSchema, scoreValueSchema).default({}),
  notes: z.string().max(5000).optional().default(''),
});

const migrationSchema = z.object({
  attempts: z.array(attemptInputSchema).max(500),
});

function parseDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function serializeAttempt(attempt: {
  id: string;
  title: string;
  date: Date;
  path: string;
  values: unknown;
  readingCounts: unknown;
  official: unknown;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: attempt.id,
    title: attempt.title,
    date: formatDateOnly(attempt.date),
    path: attempt.path,
    values: attempt.values,
    readingCounts: attempt.readingCounts ?? {},
    official: attempt.official,
    notes: attempt.notes,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
  };
}

export async function attemptRoutes(app: FastifyInstance) {
  app.get('/api/attempts', { preHandler: requireAuth }, async (request) => {
    const authRequest = request as AuthenticatedRequest;
    const attempts = await prisma.attempt.findMany({
      where: { userId: authRequest.user.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return { attempts: attempts.map(serializeAttempt) };
  });

  app.post('/api/attempts', { preHandler: requireAuth }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const body = attemptInputSchema.parse(request.body);
    const attempt = await prisma.attempt.create({
      data: {
        id: body.id,
        userId: authRequest.user.id,
        title: body.title,
        date: parseDateOnly(body.date),
        path: body.path,
        values: body.values,
        readingCounts: body.readingCounts,
        official: body.official,
        notes: body.notes,
      },
    });

    return reply.status(201).send({ attempt: serializeAttempt(attempt) });
  });

  app.put('/api/attempts/:id', { preHandler: requireAuth }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = attemptInputSchema.omit({ id: true }).parse(request.body);

    const existing = await prisma.attempt.findFirst({
      where: { id: params.id, userId: authRequest.user.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: '未找到该模考记录。' });
    }

    const attempt = await prisma.attempt.update({
      where: { id: params.id },
      data: {
        title: body.title,
        date: parseDateOnly(body.date),
        path: body.path,
        values: body.values,
        readingCounts: body.readingCounts,
        official: body.official,
        notes: body.notes,
      },
    });

    return { attempt: serializeAttempt(attempt) };
  });

  app.delete('/api/attempts/:id', { preHandler: requireAuth }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const existing = await prisma.attempt.findFirst({
      where: { id: params.id, userId: authRequest.user.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: '未找到该模考记录。' });
    }

    await prisma.attempt.delete({ where: { id: params.id } });
    return reply.send({ ok: true });
  });

  app.post('/api/migration/local-storage', { preHandler: requireAuth }, async (request) => {
    const authRequest = request as AuthenticatedRequest;
    const body = migrationSchema.parse(request.body);
    const imported = [];

    for (const input of body.attempts) {
      const existing = input.id
        ? await prisma.attempt.findFirst({ where: { id: input.id, userId: authRequest.user.id } })
        : null;

      const attempt = existing
        ? await prisma.attempt.update({
            where: { id: existing.id },
            data: {
              title: input.title,
              date: parseDateOnly(input.date),
              path: input.path,
              values: input.values,
              readingCounts: input.readingCounts,
              official: input.official,
              notes: input.notes,
            },
          })
        : await prisma.attempt.create({
            data: {
              id: input.id ?? randomUUID(),
              userId: authRequest.user.id,
              title: input.title,
              date: parseDateOnly(input.date),
              path: input.path,
              values: input.values,
              readingCounts: input.readingCounts,
              official: input.official,
              notes: input.notes,
            },
          });

      imported.push(serializeAttempt(attempt));
    }

    return { importedCount: imported.length, attempts: imported };
  });
}
