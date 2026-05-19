import { z } from 'zod';

export const SecurityMetricsSchema = z.object({
  blocked_requests: z.number(),
  rate_limited: z.number(),
  shadow_banned: z.number()
});

export type SecurityMetrics = z.infer<typeof SecurityMetricsSchema>;

export const MpcCeremonySchema = z.object({
  id: z.string(),
  payload: z.string(),
  threshold: z.number(),
  participants: z.array(z.string()),
  status: z.enum(['pending', 'completed', 'failed'])
});

export type MpcCeremony = z.infer<typeof MpcCeremonySchema>;
