import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { MPCWallet } from '@zwallet/crypto';

const app = Fastify({ logger: true });

interface CeremonyState {
  id: string;
  payload: string;
  threshold: number;
  participants: Set<string>;
  shares: Map<string, Buffer>;
  status: 'pending' | 'completed' | 'failed';
}

const ceremonies = new Map<string, CeremonyState>();

app.get('/health', async () => ({ service: 'mpc-service', status: 'ok' }));

/**
 * Verifies the attestation of a remote signer (simulating SGX/Nitro Enclave checks).
 */
function verifyAttestation(token: string): boolean {
  return token.startsWith('attest_') && token.length > 20;
}

app.post('/v1/mpc/request-sign', async (req, reply) => {
  const { payload, threshold, participants, attestationToken } = req.body as any;
  
  if (!attestationToken || !verifyAttestation(attestationToken)) {
    return reply.code(403).send({ error: 'invalid_attestation' });
  }

  if (!payload || !threshold || !Array.isArray(participants)) {
    return reply.code(400).send({ error: 'invalid_request_params' });
  }

  const id = randomUUID();
  ceremonies.set(id, {
    id,
    payload,
    threshold,
    participants: new Set(participants),
    shares: new Map(),
    status: 'pending'
  });

  return { id, status: 'pending_ceremony' };
});

app.post('/v1/mpc/participate', async (req, reply) => {
  const { requestId, participantId, shareHex } = req.body as any;
  const ceremony = ceremonies.get(requestId);

  if (!ceremony) return reply.code(404).send({ error: 'ceremony_not_found' });
  if (!ceremony.participants.has(participantId)) return reply.code(403).send({ error: 'unauthorized_participant' });
  if (ceremony.status !== 'pending') return reply.code(400).send({ error: 'ceremony_already_finalized' });

  ceremony.shares.set(participantId, Buffer.from(shareHex, 'hex'));

  if (ceremony.shares.size >= ceremony.threshold) {
    try {
      const wallet = new MPCWallet(ceremony.threshold);
      ceremony.shares.forEach((share, id) => wallet.addShare({ id, share }));
      
      const signature = wallet.sign(Buffer.from(ceremony.payload));
      ceremony.status = 'completed';
      
      return { status: 'completed', signature: signature.toString('hex') };
    } catch (e: any) {
      ceremony.status = 'failed';
      return reply.code(500).send({ error: 'aggregation_failed', detail: e.message });
    }
  }

  return { status: 'acknowledged', progress: `${ceremony.shares.size}/${ceremony.threshold}` };
});

await app.listen({ port: 3005, host: '0.0.0.0' });
console.log('MPC Service listening on port 3005');
