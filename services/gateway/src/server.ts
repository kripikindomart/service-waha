import 'dotenv/config';
import Fastify, { FastifyRequest } from 'fastify';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';
const gatewayApiKey = process.env.GATEWAY_API_KEY ?? '';
const adminUsername = process.env.GATEWAY_ADMIN_USERNAME ?? 'admin';
const adminPassword = process.env.GATEWAY_ADMIN_PASSWORD ?? '';
const wahaBaseUrl = process.env.WAHA_BASE_URL ?? 'http://127.0.0.1:3000';
const wahaApiKey = process.env.WAHA_API_KEY ?? '';

if (!gatewayApiKey || !wahaApiKey || !adminPassword) {
  throw new Error('GATEWAY_API_KEY, GATEWAY_ADMIN_PASSWORD and WAHA_API_KEY are required');
}

const app = Fastify({ logger: true });
const waha = axios.create({
  baseURL: wahaBaseUrl,
  headers: { 'X-Api-Key': wahaApiKey },
  timeout: 15_000,
});

function authorized(request: FastifyRequest) {
  const value = request.headers['x-api-key'];
  return typeof value === 'string' && safeEqual(value, gatewayApiKey);
}

function safeEqual(value: string, expected: string) {
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sessionToken() {
  const payload = `admin:${Date.now() + 86_400_000}`;
  const signature = createHmac('sha256', gatewayApiKey).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

function validSession(value?: string) {
  if (!value) return false;
  try {
    const decoded = Buffer.from(value, 'base64url').toString();
    const [role, expiry, signature] = decoded.split(':');
    const payload = `${role}:${expiry}`;
    const expected = createHmac('sha256', gatewayApiKey).update(payload).digest('hex');
    return role === 'admin' && Number(expiry) > Date.now() && safeEqual(signature ?? '', expected);
  } catch {
    return false;
  }
}

function cookie(request: FastifyRequest, name: string) {
  const header = request.headers.cookie ?? '';
  return header.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

function browserAuthorized(request: FastifyRequest) {
  return authorized(request) || validSession(cookie(request, 'gw_session'));
}

app.get('/', async (_request, reply) => {
  const html = await readFile(join(process.cwd(), 'public', 'index.html'), 'utf8');
  return reply.type('text/html').send(html);
});

app.post<{ Body: { username?: string; password?: string } }>('/auth/login', async (request, reply) => {
  if (request.body?.username !== adminUsername || request.body?.password !== adminPassword) {
    return reply.code(401).send({ error: 'invalid_credentials' });
  }
  return reply.header('Set-Cookie', `gw_session=${sessionToken()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`).send({ ok: true });
});

app.post('/auth/logout', async (_request, reply) => reply.header('Set-Cookie', 'gw_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0').send({ ok: true }));
app.get('/auth/me', async (request, reply) => browserAuthorized(request) ? { authenticated: true } : reply.code(401).send({ authenticated: false }));

app.get('/health', async () => ({ status: 'ok', service: 'gateway' }));

app.addHook('onRequest', async (request, reply) => {
  if (request.url === '/' || request.url === '/health' || request.url.startsWith('/auth/')) return;
  if (!browserAuthorized(request)) return reply.code(401).send({ error: 'unauthorized' });
});

app.get('/v1/sessions', async (_request, reply) => {
  const response = await waha.get('/api/sessions');
  return reply.send(response.data);
});

app.post<{ Body: Record<string, unknown> }>('/v1/sessions', async (request, reply) => {
  const response = await waha.post('/api/sessions', request.body ?? {});
  return reply.code(response.status).send(response.data);
});

app.post<{ Params: { session: string } }>('/v1/sessions/:session/stop', async (request, reply) => {
  const response = await waha.post(`/api/sessions/${encodeURIComponent(request.params.session)}/stop`);
  return reply.code(response.status).send(response.data);
});

app.get<{ Params: { session: string } }>('/v1/sessions/:session/qr', async (request, reply) => {
  const response = await waha.get(`/api/${encodeURIComponent(request.params.session)}/auth/qr`);
  return reply.code(response.status).send(response.data);
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
