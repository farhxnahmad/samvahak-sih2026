// Thin client for the SAMVAHAK backend (samvahak-backend, Express + MongoDB).
// This talks to real, live endpoints — everything else in lib/ (risk, isolation,
// supply, disaster, copilot) runs on the sample road/village model built into this
// frontend and does not go through this client. See README.md, "Connecting to the
// backend", for what it would take to wire those to live data.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";
const TIMEOUT_MS = 5000;

export class BackendError extends Error {}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    if (!res.ok) throw new BackendError(`${path} responded ${res.status}`);
    const body = (await res.json()) as Envelope<T>;
    if (!body.success) throw new BackendError(`${path} returned success: false`);
    return body.data;
  } catch (err) {
    if (err instanceof BackendError) throw err;
    throw new BackendError(err instanceof Error ? err.message : "Network error");
  } finally {
    clearTimeout(timer);
  }
}

export { BASE_URL as BACKEND_BASE_URL };
