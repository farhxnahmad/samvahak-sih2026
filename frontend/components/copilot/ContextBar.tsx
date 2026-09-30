"use client";

import { FEED_LABEL } from "@/lib/copilot/utils";
import type { ContextItem, FeedId } from "@/lib/copilot/types";

const FEEDS: FeedId[] = ["weather", "routes", "incidents", "risk"];

export default function ContextBar({ context }: { context: ContextItem[] | null }) {
  return (
    <div
      role="group"
      aria-label="Context feeds"
      className="glass-dark absolute left-3 top-[76px] z-20 flex items-center gap-4 rounded-xl px-3 py-2 lg:bottom-4 lg:left-1/2 lg:top-auto lg:-translate-x-1/2 lg:gap-5 lg:px-4"
    >
      <span className="hidden text-[11px] font-semibold uppercase tracking-widest text-sand-300 lg:inline">Feeds</span>
      {FEEDS.map((feed) => {
        const used = context ? context.find((c) => c.feed === feed)?.used === true : false;
        return (
          <span key={feed} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: used ? "#5fbf86" : "rgba(248,244,234,0.3)", boxShadow: used ? "0 0 6px #5fbf86" : undefined }}
              aria-hidden="true"
            />
            <span className={used ? "text-sand-50" : "text-sand-300"}>{FEED_LABEL[feed]}</span>
            <span className="sr-only">{used ? "used in this answer" : "not used in this answer"}</span>
          </span>
        );
      })}
    </div>
  );
}
