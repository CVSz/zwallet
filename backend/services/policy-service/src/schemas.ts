import { z } from 'zod';

export const preSignRequestSchema = z.object({
  userId: z.string().min(1),
  chain: z.string().min(1),
  amount: z.string().min(1),
  destination: z.string().min(1)
});

export type PreSignRequestSchema = z.infer<typeof preSignRequestSchema>;
