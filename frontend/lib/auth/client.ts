import { BACKEND_BASE_URL } from "../backend/client";
import type { AuthUser, Session } from "./types";

// Talks to the real backend's auth module (samvahak-backend/src/modules/auth).
// Every route here is live — there is no sample-data fallback for sign-in.

interface Envelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  details?: { field: string; message: string }[];
}

export class AuthApiError extends Error {
  fieldErrors: { field: string; message: string }[];
  constructor(message: string, fieldErrors: { field: string; message: string }[] = []) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, options: { method: "GET" | "POST"; body?: unknown; token?: string }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(`${BACKEND_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    throw new AuthApiError(`Could not reach the backend at ${BACKEND_BASE_URL}. Is it running?`);
  }
  clearTimeout(timer);

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    // fall through with body === null
  }

  if (!res.ok || !body || !body.success) {
    throw new AuthApiError(body?.message ?? `Request failed (${res.status})`, body?.details ?? []);
  }
  return body.data as T;
}

export function login(email: string, password: string): Promise<Session> {
  return request<Session>("/auth/login", { method: "POST", body: { email, password } });
}

export function register(name: string, email: string, password: string): Promise<Session> {
  return request<Session>("/auth/register", { method: "POST", body: { name, email, password } });
}

export function me(token: string): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>("/auth/me", { method: "GET", token });
}
