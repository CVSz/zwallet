import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const app = Fastify({ logger: true });

const UserOpSchema = z.object({
  sender: z.string(),
  nonce: z.string(),
  initCode: z.string(),
  callData: z.string(),
  callGasLimit: z.string(),
  verificationGasLimit: z.string(),
  preVerificationGas: z.string(),
  maxFeePerGas: z.string(),
  maxPriorityFeePerGas: z.string(),
  paymasterAndData: z.string(),
  signature: z.string()
});

app.get('/health', async () => ({ service: 'aa-orchestrator', status: 'ok' }));

app.post('/v1/aa/build-userop', async (req, reply) => {
  const { sender, target, value, data } = req.body as any;
  
  // Simulated Gas Estimation & Nonce Fetching
  const userOp = {
    sender,
    nonce: `0x${Math.floor(Math.random() * 100).toString(16)}`,
    initCode: "0x",
    callData: data || "0x",
    callGasLimit: "0x5208",
    verificationGasLimit: "0x186a0",
    preVerificationGas: "0x11170",
    maxFeePerGas: "0x3b9aca00",
    maxPriorityFeePerGas: "0x3b9aca00",
    paymasterAndData: "0x",
    signature: "0x"
  };

  return userOp;
});

app.post('/v1/aa/submit-userop', async (req, reply) => {
  const { userOp } = req.body as any;
  
  const parsed = UserOpSchema.safeParse(userOp);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_user_operation' });

  // Simulation Step
  console.log(`[AA-Orchestrator] Simulating UserOp for ${userOp.sender}...`);
  const simulationOk = Math.random() > 0.1;
  
  if (!simulationOk) {
    return reply.code(422).send({ error: 'simulation_failed', reason: 'execution_reverted' });
  }

  const userOpHash = `0x${randomUUID().replace(/-/g, '')}`;
  console.log(`[AA-Orchestrator] UserOp submitted: ${userOpHash}`);
  
  return { userOpHash, status: 'submitted' };
});

await app.listen({ port: 3006, host: '0.0.0.0' });
console.log('AA Orchestrator listening on port 3006');
