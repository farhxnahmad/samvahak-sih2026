import { Sparkles } from "lucide-react";

interface InsightsPanelProps {
  title?: string;
  items: string[];
}

export default function InsightsPanel({ title = "AI insights", items }: InsightsPanelProps) {
  return (
    <section aria-label={title} className="rounded-lg bg-river-100/70 p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-river-700">
        <Sparkles size={15} aria-hidden="true" />
        {title}
      </h3>
      <ul className="mt-2 space-y-2">
        {items.map((text) => (
          <li key={text} className="text-sm leading-relaxed text-forest-900">
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
