"use client";

import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { ROLE_LABEL } from "@/lib/auth/types";
import type { AuthState } from "@/lib/auth/useAuth";

export default function AuthStatus({ auth }: { auth: AuthState }) {
  const [open, setOpen] = useState(false);

  if (auth.mode === "guest") {
    return (
      <button
        type="button"
        onClick={auth.signOut}
        className="hidden items-center gap-1.5 rounded-md border border-sand-300 bg-sand-100/70 px-2 py-1 text-xs text-forest-800 transition-colors hover:bg-sand-100 sm:flex"
        title="You're browsing without an account."
      >
        <User size={12} aria-hidden="true" />
        Guest, sign in
      </button>
    );
  }

  if (auth.mode !== "authenticated" || !auth.user) return null;

  return (
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-sand-300 bg-sand-100/70 px-2 py-1 text-xs text-forest-800 transition-colors hover:bg-sand-100"
        title={auth.user.email}
      >
        <User size={12} aria-hidden="true" />
        {auth.user.name.split(" ")[0]}
        <span className="text-forest-700">· {ROLE_LABEL[auth.user.role]}</span>
      </button>
      {open && (
        <div className="glass absolute right-0 top-full z-40 mt-1.5 w-52 rounded-lg p-1.5">
          <p className="truncate px-2 py-1 text-xs text-forest-700">{auth.user.email}</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              auth.signOut();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-forest-900 hover:bg-forest-800/10"
          >
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
