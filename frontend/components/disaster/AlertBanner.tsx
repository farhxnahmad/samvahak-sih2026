"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import type { DisasterAlert } from "@/lib/disaster/types";
import { EASE } from "@/lib/motion";

export const ALERT_COLOR = { critical: "#e0523f", warning: "#e2842a", info: "#4f9dc2" } as const;

export default function AlertBanner({ alert }: { alert: DisasterAlert | null }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[76px] z-30 hidden justify-center xl:flex">
      <AnimatePresence mode="wait">
        {alert && (
          <motion.div
            key={alert.id}
            role="alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="glass-dark pointer-events-auto flex max-w-[440px] items-start gap-3 rounded-xl px-4 py-3"
            style={{ borderLeft: `4px solid ${ALERT_COLOR[alert.level]}` }}
          >
            <TriangleAlert size={18} className="mt-0.5 shrink-0" style={{ color: ALERT_COLOR[alert.level] }} aria-hidden="true" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-sand-300">
                T+{alert.hour}h, {alert.level}
              </p>
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-sand-200">{alert.detail}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
