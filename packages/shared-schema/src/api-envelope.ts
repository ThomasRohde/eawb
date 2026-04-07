import { z } from 'zod';

export const ApiEnvelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiEnvelope<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
};

export function success<T>(data: T): ApiEnvelope<T> {
  return { ok: true, data };
}

export function failure(error: string, code?: string, details?: unknown): ApiEnvelope<never> {
  return { ok: false, error, code, details };
}
