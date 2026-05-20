import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['user', 'admin', 'operator', 'readonly']),
  createdAt: z.string().datetime()
});

export type User = z.infer<typeof UserSchema>;

export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional()
});

export type AuthToken = z.infer<typeof AuthTokenSchema>;
