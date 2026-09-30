"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { EASE } from "@/lib/motion";
import type { AuthState } from "@/lib/auth/useAuth";

interface LoginScreenProps {
  auth: AuthState;
}

type Tab = "login" | "register";

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#17392a" />
      <path
        d="M6 23 L13 12 L18 18 L21 14 L26 23"
        fill="none"
        stroke="#f8f4ea"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="8.5" r="2.2" fill="#4f9dc2" />
    </svg>
  );
}

function fieldError(errors: AuthState["fieldErrors"], field: string): string | null {
  return errors.find((e) => e.field === field)?.message ?? null;
}

export default function LoginScreen({ auth }: LoginScreenProps) {
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "login") auth.login(email.trim(), password);
    else auth.register(name.trim(), email.trim(), password);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    auth.dismissError();
  };

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-sand-200 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="glass w-full max-w-[400px] rounded-xl p-6"
      >
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">Samvahak</p>
            <p className="text-xs text-forest-700">North East Region command center</p>
          </div>
        </div>

        <div role="tablist" aria-label="Sign in or create an account" className="mt-6 flex gap-1 rounded-lg bg-forest-800/10 p-1">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => switchTab(t)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t ? "bg-sand-50 text-forest-900 shadow-sm" : "text-forest-700 hover:text-forest-900"
              }`}
            >
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {tab === "register" && (
            <label className="block text-sm">
              <span className="text-forest-800">Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1 h-11 w-full rounded-lg border border-forest-800/15 bg-sand-50/80 px-3 text-sm"
              />
              {fieldError(auth.fieldErrors, "name") && (
                <span className="mt-1 block text-xs text-[#96331f]">{fieldError(auth.fieldErrors, "name")}</span>
              )}
            </label>
          )}

          <label className="block text-sm">
            <span className="text-forest-800">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 h-11 w-full rounded-lg border border-forest-800/15 bg-sand-50/80 px-3 text-sm"
            />
            {fieldError(auth.fieldErrors, "email") && (
              <span className="mt-1 block text-xs text-[#96331f]">{fieldError(auth.fieldErrors, "email")}</span>
            )}
          </label>

          <label className="block text-sm">
            <span className="text-forest-800">Password</span>
            <input
              type="password"
              required
              minLength={tab === "register" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              className="mt-1 h-11 w-full rounded-lg border border-forest-800/15 bg-sand-50/80 px-3 text-sm"
            />
            {fieldError(auth.fieldErrors, "password") ? (
              <span className="mt-1 block text-xs text-[#96331f]">{fieldError(auth.fieldErrors, "password")}</span>
            ) : (
              tab === "register" && <span className="mt-1 block text-xs text-forest-700">At least 8 characters.</span>
            )}
          </label>

          {auth.error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-[#b0432f1a] px-3 py-2 text-xs leading-relaxed text-[#96331f]">
              <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {auth.error}
            </p>
          )}

          <button
            type="submit"
            disabled={auth.busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest-800 text-sm font-medium text-sand-50 transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {auth.busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {tab === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {tab === "register" && (
          <p className="mt-3 text-xs leading-relaxed text-forest-700">
            New accounts are created as Citizen. Government and district officer accounts are created by an administrator.
          </p>
        )}

        <div className="mt-5 border-t border-forest-800/10 pt-4 text-center">
          <button
            type="button"
            onClick={auth.continueAsGuest}
            className="text-sm font-medium text-river-700 underline decoration-river-400 underline-offset-2 hover:text-river-500"
          >
            Continue without signing in
          </button>
          <p className="mt-1.5 text-xs text-forest-700">
            The map views work without an account. Sign in only to save reports or use a staff role.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
