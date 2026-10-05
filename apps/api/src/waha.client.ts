import axios, { AxiosInstance } from 'axios';

export type WahaEngine = 'NOWEB' | 'GOWS';

export function normalizeEngine(value?: string): WahaEngine {
  return String(value ?? 'NOWEB').toUpperCase() === 'GOWS' ? 'GOWS' : 'NOWEB';
}

export function wahaClient(engine?: string): AxiosInstance {
  const selected = normalizeEngine(engine);
  const baseURL = selected === 'GOWS'
    ? (process.env.WAHA_GOWS_BASE_URL ?? 'http://127.0.0.1:3003')
    : (process.env.WAHA_BASE_URL ?? 'http://127.0.0.1:3002');
  return axios.create({ baseURL, headers: { 'X-Api-Key': process.env.WAHA_API_KEY ?? '' }, timeout: selected === 'GOWS' ? 120000 : 30000 });
}
