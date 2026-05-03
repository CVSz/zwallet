import { z } from 'zod';

export const SUPPORTED_CHAINS = ['evm', 'solana', 'bitcoin'] as const;

export const chainSchema = z.enum(SUPPORTED_CHAINS);

export const transferRequestSchema = z.object({
  chain: chainSchema,
  from: z.string().min(10),
  to: z.string().min(10),
  amountAtomic: z.string().regex(/^\d+$/),
  nonce: z.number().int().nonnegative().optional(),
  createdAt: z.string().datetime().optional()
});

export const walletEventTypeSchema = z.enum([
  'wallet.created',
  'wallet.transfer.requested',
  'wallet.transfer.signed',
  'wallet.transfer.broadcasted'
]);

export const walletEventSchema = z.object({
  id: z.string().uuid(),
  type: walletEventTypeSchema,
  chain: chainSchema,
  occurredAt: z.string().datetime(),
  userId: z.string().min(1),
  payload: z.object({
    from: z.string().min(10).optional(),
    to: z.string().min(10).optional(),
    amountAtomic: z.string().regex(/^\d+$/).optional(),
    txHash: z.string().min(10).optional()
  })
});

export type SupportedChain = z.infer<typeof chainSchema>;
export type TransferRequest = z.infer<typeof transferRequestSchema>;
export type WalletEventType = z.infer<typeof walletEventTypeSchema>;
export type WalletEvent = z.infer<typeof walletEventSchema>;

export interface OpenApiSchemaObject {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
  };
  paths: {
    '/v1/transfers': {
      post: {
        operationId: 'createTransfer';
        requestBody: {
          required: true;
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/TransferRequest';
              };
            };
          };
        };
        responses: {
          '202': {
            description: 'Accepted';
          };
        };
      };
    };
  };
  components: {
    schemas: {
      TransferRequest: {
        type: 'object';
        required: ['chain', 'from', 'to', 'amountAtomic'];
        properties: {
          chain: { enum: readonly ['evm', 'solana', 'bitcoin'] };
          from: { type: 'string'; minLength: 10 };
          to: { type: 'string'; minLength: 10 };
          amountAtomic: { type: 'string'; pattern: '^\\d+$' };
          nonce: { type: 'integer'; minimum: 0 };
          createdAt: { type: 'string'; format: 'date-time' };
        };
      };
      WalletEvent: {
        type: 'object';
      };
    };
  };
}

export const walletOpenApiSpec: OpenApiSchemaObject = {
  openapi: '3.1.0',
  info: {
    title: 'zWallet API',
    version: '1.0.0'
  },
  paths: {
    '/v1/transfers': {
      post: {
        operationId: 'createTransfer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/TransferRequest'
              }
            }
          }
        },
        responses: {
          '202': {
            description: 'Accepted'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      TransferRequest: {
        type: 'object',
        required: ['chain', 'from', 'to', 'amountAtomic'],
        properties: {
          chain: { enum: SUPPORTED_CHAINS },
          from: { type: 'string', minLength: 10 },
          to: { type: 'string', minLength: 10 },
          amountAtomic: { type: 'string', pattern: '^\\d+$' },
          nonce: { type: 'integer', minimum: 0 },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      WalletEvent: {
        type: 'object'
      }
    }
  }
};

export const prismaSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model WalletTransfer {
  id           String   @id @default(uuid())
  chain        String
  fromAddress  String
  toAddress    String
  amountAtomic String
  nonce        Int?
  createdAt    DateTime @default(now())
}

model WalletEvent {
  id         String   @id @default(uuid())
  type       String
  chain      String
  occurredAt DateTime
  userId     String
  payload    Json
}
`.trim();
