"use client";

import { useCallback, useEffect, useState } from "react";
import * as authApi from "./client";
import type { AuthUser } from "./types";

export type AuthMode = "checking" | "login" | "guest" | "authenticated";

const TOKEN_KEY = "samvahak.token";
const GUEST_KEY = "samvahak.guest";

export interface AuthState {
  mode: AuthMode;
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  fieldErrors: { field: string; message: string }[];
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => void;
  dismissError: () => void;
}

// Session lives in this hook, called once from CommandCenter and passed down —
// the same pattern the rest of the app uses (useScenario, useCopilot), rather
// than a React context, since only Header and the login gate need it.
export function useAuth(): AuthState {
  const [mode, setMode] = useState<AuthMode>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ field: string; message: string }[]>([]);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setMode(window.localStorage.getItem(GUEST_KEY) === "1" ? "guest" : "login");
      return;
    }
    authApi
      .me(token)
      .then((res) => {
        setUser(res.user);
        setMode("authenticated");
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        setMode("login");
      });
  }, []);

  const run = useCallback(async (fn: () => Promise<{ user: AuthUser; token: string }>) => {
    setBusy(true);
    setError(null);
    setFieldErrors([]);
    try {
      const session = await fn();
      window.localStorage.setItem(TOKEN_KEY, session.token);
      window.localStorage.removeItem(GUEST_KEY);
      setUser(session.user);
      setMode("authenticated");
    } catch (err) {
      if (err instanceof authApi.AuthApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const login = useCallback((email: string, password: string) => run(() => authApi.login(email, password)), [run]);
  const register = useCallback(
    (name: string, email: string, password: string) => run(() => authApi.register(name, email, password)),
    [run]
  );

  const continueAsGuest = useCallback(() => {
    window.localStorage.setItem(GUEST_KEY, "1");
    setMode("guest");
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(GUEST_KEY);
    setUser(null);
    setError(null);
    setFieldErrors([]);
    setMode("login");
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
    setFieldErrors([]);
  }, []);

  return { mode, user, busy, error, fieldErrors, login, register, continueAsGuest, signOut, dismissError };
}
