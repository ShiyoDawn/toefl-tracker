import type { FastifyReply, FastifyRequest } from 'fastify';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
};

export type AuthenticatedRequest = FastifyRequest & {
  user: AuthUser;
};

export type RouteHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
