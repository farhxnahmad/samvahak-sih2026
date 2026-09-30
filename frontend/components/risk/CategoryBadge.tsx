import { CATEGORY, type RiskCategory } from "@/lib/risk/model";

export default function CategoryBadge({ category }: { category: RiskCategory }) {
  const c = CATEGORY[category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: c.ink, backgroundColor: `${c.color}26` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c.color }}
        aria-hidden="true"
      />
      {c.label}
    </span>
  );
}
