import 'dotenv/config';
import Fastify, { FastifyRequest } from 'fastify';
import axios from 'axios';

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';
const gatewayApiKey = process.env.GATEWAY_API_KEY ?? '';
const wahaBaseUrl = process.env.WAHA_BASE_URL ?? 'http://127.0.0.1:3000';
const wahaApiKey = process.env.WAHA_API_KEY ?? '';

if (!gatewayApiKey || !wahaApiKey) {
  throw new Error('GATEWAY_API_KEY and WAHA_API_KEY are required');
}

const app = Fastify({ logger: true });
const waha = axios.create({
  baseURL: wahaBaseUrl,
  headers: { 'X-Api-Key': wahaApiKey },
  timeout: 15_000,
});

function authorized(request: FastifyRequest) {
  return request.headers['x-api-key'] === gatewayApiKey;
}

app.get('/health', async () => ({ status: 'ok', service: 'gateway' }));

app.addHook('onRequest', async (request, reply) => {
  if (request.url === '/health') return;
  if (!authorized(request)) return reply.code(401).send({ error: 'unauthorized' });
});

app.get('/v1/sessions', async (_request, reply) => {
  const response = await waha.get('/api/sessions');
  return reply.send(response.data);
});

app.post<{ Params: { session: string } }>('/v1/sessions/:session/start', async (request, reply) => {
  const response = await waha.post(`/api/sessions/${encodeURIComponent(request.params.session)}/start`);
  return reply.code(response.status).send(response.data);
});

app.post<{ Params: { session: string }; Body: { chatId: string; text: string } }>(
  '/v1/sessions/:session/messages/text',
  async (request, reply) => {
    if (!request.body?.chatId || !request.body?.text) {
      return reply.code(400).send({ error: 'chatId and text are required' });
    }

    const response = await waha.post('/api/sendText', {
      session: request.params.session,
      chatId: request.body.chatId,
      text: request.body.text,
    });
    return reply.code(response.status).send(response.data);
  },
);

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
