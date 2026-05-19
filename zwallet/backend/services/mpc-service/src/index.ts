import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { randomUUID, createHmac } from 'node:crypto';
import { MPCWallet } from '@zwallet/crypto';

const app = Fastify({ 
  logger: {
    level: 'info',
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, ip: req.ip }),
    }
  } 
});

// Hardening: Rate Limiting (100 requests per minute)
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

interface CeremonyState {
  id: string;
  payload: string;
  threshold: number;
  participants: Set<string>;
  shares: Map<string, Buffer>;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
}

const ceremonies = new Map<string, CeremonyState>();
const CEREMONY_TIMEOUT_MS = 60000; // 60 seconds

// Hardening: Automatic Cleanup of stale ceremonies
setInterval(() => {
  const now = Date.now();
  for (const [id, ceremony] of ceremonies.entries()) {
    if (ceremony.status === 'pending' && now - ceremony.createdAt > CEREMONY_TIMEOUT_MS) {
      app.log.warn({ ceremonyId: id }, 'Ceremony timed out');
      ceremonies.delete(id);
    }
  }
}, 10000);

app.get('/health', async () => ({ service: 'mpc-service', status: 'ok', activeCeremonies: ceremonies.size }));

/**
 * Hardening: Advanced Attestation Verification
 * Simulates checking a cryptographic signature from a TEE enclave.
 */
function verifyAttestation(participantId: string, token: string): boolean {
  if (!token.startsWith('attest_v2_')) return false;
  
  // Simulation: Verify HMAC of participantId with a global shared "enclave secret"
  const expectedHmac = createHmac('sha256', 'SYSTEM_ENCLAVE_SECRET_SIM')
    .update(participantId)
    .digest('hex');
    
  const providedHmac = token.split('_')[2];
  return providedHmac === expectedHmac;
}

app.post('/v1/mpc/request-sign', async (req, reply) => {
  const { payload, threshold, participants, attestationToken } = req.body as any;
  
  app.log.info({ payload, threshold, participants }, 'New signing request received');

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
    status: 'pending',
    createdAt: Date.now()
  });

  return { id, status: 'pending_ceremony', timeout: CEREMONY_TIMEOUT_MS };
});

app.post('/v1/mpc/participate', async (req, reply) => {
  const { requestId, participantId, shareHex, attestationToken } = req.body as any;
  const ceremony = ceremonies.get(requestId);

  if (!ceremony) return reply.code(404).send({ error: 'ceremony_not_found' });
  
  // Hardening: Verify Attestation on participation
  if (!attestationToken || !verifyAttestation(participantId, attestationToken)) {
    app.log.error({ participantId, requestId }, 'Unauthorized participation attempt: invalid attestation');
    return reply.code(403).send({ error: 'invalid_attestation' });
  }

  if (!ceremony.participants.has(participantId)) return reply.code(403).send({ error: 'unauthorized_participant' });
  if (ceremony.status !== 'pending') return reply.code(400).send({ error: 'ceremony_already_finalized' });

  ceremony.shares.set(participantId, Buffer.from(shareHex, 'hex'));
  app.log.info({ requestId, participantId, progress: `${ceremony.shares.size}/${ceremony.threshold}` }, 'Participant added share');

  if (ceremony.shares.size >= ceremony.threshold) {
    try {
      const wallet = new MPCWallet(ceremony.threshold);
      ceremony.shares.forEach((share, id) => wallet.addShare({ id, share }));
      
      const signature = wallet.sign(Buffer.from(ceremony.payload));
      ceremony.status = 'completed';
      
      app.log.info({ requestId }, 'Ceremony completed successfully');
      return { status: 'completed', signature: signature.toString('hex') };
    } catch (e: any) {
      ceremony.status = 'failed';
      app.log.error({ requestId, error: e.message }, 'Aggregation failed');
      return reply.code(500).send({ error: 'aggregation_failed', detail: e.message });
    }
  }

  return { status: 'acknowledged', progress: `${ceremony.shares.size}/${ceremony.threshold}` };
});

const start = async () => {
  try {
    await app.listen({ port: 3005, host: '0.0.0.0' });
    console.log('🛡️ MPC Service listening on port 3005 (HARDENED)');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
