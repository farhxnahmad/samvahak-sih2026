"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, TriangleAlert } from "lucide-react";
import ImpactChart from "./ImpactChart";
import { ALERT_COLOR } from "./AlertBanner";
import { TYPE_ICON } from "./icons";
import { hubById } from "@/lib/data";
import { SEVERITY_LABEL, TYPE_INFO } from "@/lib/disaster/meta";
import type { Decision, DisasterAlert, Scenario, StepResult } from "@/lib/disaster/types";
import { EDGE_BY_ID } from "@/lib/isolation/network";
import { MEDICAL_STYLE } from "@/lib/isolation/style";
import { fmt, plural } from "@/lib/format";
import { DISTRICT_RISKS } from "@/lib/risk/engine";
import { CATEGORY, categoryOf } from "@/lib/risk/model";
import { GOODS } from "@/lib/supply/goods";
import { EASE } from "@/lib/motion";

type Tab = "impact" | "decisions" | "alerts";

interface IncidentPanelProps {
  scenario: Scenario;
  step: StepResult;
  stepIndex: number;
  decisions: Decision[];
  alerts: DisasterAlert[];
  onEdit: () => void;
}

function AnimatedValue({ value }: { value: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="inline-block"
    >
      {value}
    </motion.span>
  );
}

const PRIORITY_COLOR: Record<Decision["priority"], string> = {
  Immediate: "#e0523f",
  "Within 12 hours": "#e2842a",
  "Within 24 hours": "#4f9dc2",
};

export default function IncidentPanel({ scenario, step, stepIndex, decisions, alerts, onEdit }: IncidentPanelProps) {
  const [tab, setTab] = useState<Tab>("impact");
  const info = TYPE_INFO[scenario.config.type];
  const Icon = TYPE_ICON[scenario.config.type];
  const medical = MEDICAL_STYLE[step.medical.risk];

  const districts = DISTRICT_RISKS.map((d) => ({ d, s: step.districts[d.id] }))
    .sort((a, b) => b.s.score - a.s.score)
    .slice(0, 6);

  const tabs: { id: Tab; label: string }[] = [
    { id: "impact", label: "Impact" },
    { id: "decisions", label: "Decisions" },
    { id: "alerts", label: `Alerts ${alerts.length}` },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      aria-label="Incident summary"
      className="glass-dark absolute inset-x-3 bottom-7 z-20 max-h-[62dvh] overflow-y-auto rounded-xl p-4 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[76px] lg:max-h-none lg:w-[400px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${info.color}55` }}
          >
            <Icon size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-sand-300">
              Incident, T+{step.hour}h
            </p>
            <h2 className="text-lg font-semibold leading-snug">
              {SEVERITY_LABEL[scenario.config.severity]} {info.label.toLowerCase()}
            </h2>
            <p className="text-sm text-sand-200">
              {scenario.districtName}, {scenario.config.state}. Zone radius {Math.round(step.radiusKm)} km.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit scenario"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sand-100 transition-colors hover:bg-white/10 lg:hidden"
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
      </div>

      {scenario.snapped && scenario.snappedRoadName && (
        <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-sand-200">
          Placed on the {scenario.snappedRoadName} road, the nearest modelled road ({scenario.snapDistanceKm} km from the district centre).
        </p>
      )}

      <div role="tablist" aria-label="Incident views" className="mt-4 flex gap-1 rounded-lg bg-white/10 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-sand-50 text-forest-900" : "text-sand-100 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "impact" && (
        <div role="tabpanel" className="mt-4">
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-sand-300">Villages affected</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">
                <AnimatedValue value={String(step.counts.affected)} />
              </dd>
              <p className="text-xs text-sand-300">
                {step.counts.isolated} isolated, {step.counts.atRisk} at risk
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-sand-300">Population affected</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">
                <AnimatedValue value={fmt(step.population.affected)} />
              </dd>
              <p className="text-xs text-sand-300">{fmt(step.population.isolated)} isolated</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-sand-300">Supply routes impacted</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">
                <AnimatedValue value={String(step.supply.linesImpacted)} />
              </dd>
              <p className="text-xs text-sand-300">
                on {step.supply.roadsImpacted} {plural(step.supply.roadsImpacted, "road", "roads")}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-sand-300">Medical accessibility</dt>
              <dd className="mt-1">
                <span
                  className="inline-block rounded-md px-2 py-0.5 text-sm font-semibold"
                  style={{ backgroundColor: `${medical.color}55`, color: "#f8f4ea" }}
                >
                  <AnimatedValue value={step.medical.risk} />
                </span>
              </dd>
              <p className="mt-1 text-xs text-sand-300">
                {fmt(step.medical.cutOff)} cut off, {fmt(step.medical.delayed)} delayed
                {step.medical.avgExtraKm !== null ? `, +${step.medical.avgExtraKm} km` : ""}
              </p>
            </div>
          </dl>

          <h3 className="mt-5 text-sm font-semibold">Road status</h3>
          {step.blockedEdgeIds.length + step.degradedEdgeIds.length === 0 ? (
            <p className="mt-1 text-sm text-sand-300">No modelled road is affected at this time.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {step.blockedEdgeIds.map((id) => (
                <li key={id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{EDGE_BY_ID[id].name}</span>
                  <span className="rounded-md bg-[#b0432f55] px-2 py-0.5 text-xs font-medium">Blocked</span>
                </li>
              ))}
              {step.degradedEdgeIds.map((id) => (
                <li key={id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{EDGE_BY_ID[id].name}</span>
                  <span className="rounded-md bg-[#d1861f55] px-2 py-0.5 text-xs font-medium">Degraded</span>
                </li>
              ))}
            </ul>
          )}

          {step.supply.linesImpacted > 0 && (
            <p className="mt-3 text-xs leading-relaxed text-sand-300">
              Depots affected:{" "}
              {GOODS.filter((g) => step.supply.byGood[g.id] > 0)
                .map((g) => `${g.label.toLowerCase()} ${step.supply.byGood[g.id]}`)
                .join(", ")}
              .
            </p>
          )}

          <h3 className="mt-5 text-sm font-semibold">Impact over time</h3>
          <ImpactChart scenario={scenario} stepIndex={stepIndex} />
          <p className="text-xs text-sand-300">Bars: people affected. Line: villages affected.</p>

          <h3 className="mt-5 text-sm font-semibold">Accessibility risk by district</h3>
          <ul className="mt-2 space-y-2">
            {districts.map(({ d, s }) => {
              const cat = categoryOf(s.score);
              return (
                <li key={d.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{d.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {s.delta > 0 && <span className="mr-2 text-xs text-[#f0a15a]">+{s.delta}</span>}
                      <span className="font-semibold">{s.score}</span>
                      <span className="ml-2 text-xs text-sand-300">{CATEGORY[cat].label}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${s.score}%`, backgroundColor: CATEGORY[cat].color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === "decisions" && (
        <div role="tabpanel" className="mt-4">
          <h3 className="text-sm font-semibold">AI decision support</h3>
          <p className="text-xs text-sand-300">Recommended actions for T+{step.hour}h, most urgent first.</p>
          <ol className="mt-3 space-y-2">
            {decisions.map((d) => (
              <li key={d.title} className="rounded-lg bg-white/5 p-3">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: PRIORITY_COLOR[d.priority] }}
                >
                  {d.priority}
                </span>
                <p className="mt-0.5 text-sm font-semibold">{d.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-sand-200">{d.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === "alerts" && (
        <div role="tabpanel" className="mt-4">
          <h3 className="text-sm font-semibold">Alert feed</h3>
          {alerts.length === 0 ? (
            <p className="mt-1 text-sm text-sand-300">No alerts yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {alerts.map((a) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="rounded-lg bg-white/5 p-3"
                  style={{ borderLeft: `3px solid ${ALERT_COLOR[a.level]}` }}
                >
                  <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-sand-300">
                    <TriangleAlert size={12} style={{ color: ALERT_COLOR[a.level] }} aria-hidden="true" />
                    T+{a.hour}h, {a.level}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{a.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-sand-200">{a.detail}</p>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      )}
    </motion.section>
  );
}
