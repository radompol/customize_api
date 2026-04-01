"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { ForecastChart } from "@/components/ForecastChart";
import { LegendModalTrigger } from "@/components/LegendModalTrigger";
import { ReadinessTable } from "@/components/ReadinessTable";
import { RiskBadge } from "@/components/RiskBadge";
import { SummaryCard } from "@/components/SummaryCard";
import { TrendChart } from "@/components/TrendChart";
import type { ReadinessAreaRow } from "@/models/readiness.types";

type SummaryPayload = {
  overallReadinessScore: number;
  readinessLabel: string;
  riskLevel: string;
  totalPrograms?: number;
  totalRequirements: number;
  completedRequirements: number;
  pendingRequirements: number;
  averageRevisionCount: number;
  averageCommentCount: number;
  averageAgingDays: number;
  warningFlags: string[];
};

type TrendPoint = { period: string; score: number; riskLevel: string };
type ForecastPoint = { period: string; score: number; riskLevel: string };

export function DashboardView({ programs, dbMessage }: { programs: string[]; dbMessage?: string | null }) {
  const searchParams = useSearchParams();
  const program = searchParams.get("program");
  const period = searchParams.get("period");
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(programs);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [areas, setAreas] = useState<ReadinessAreaRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = program ? `?program=${encodeURIComponent(program)}` : "";
    const summaryEndpoint = program ? `/api/readiness/program/${encodeURIComponent(program)}` : "/api/readiness/summary";

    async function load() {
      try {
        setError(null);
        const responses = await Promise.all([
          fetch(summaryEndpoint),
          fetch(`/api/readiness/areas${query}`),
          fetch(`/api/readiness/trend${query}`),
          fetch(`/api/readiness/forecast${query}`)
        ]);
        const payloads = await Promise.all(responses.map((response) => response.json()));

        if (responses.some((response) => !response.ok) || payloads.some((payload) => !payload.success)) {
          const failed = payloads.find((payload) => !payload.success);
          throw new Error(failed?.error ?? "Accreditation API unavailable");
        }

        const [summaryPayload, areaPayload, trendPayload, forecastPayload] = payloads;
        if (program) {
          const scoped = summaryPayload.data?.summary;
          setSummary(
            scoped
              ? {
                  overallReadinessScore: scoped.readinessScore,
                  readinessLabel: scoped.readinessLabel,
                  riskLevel: scoped.riskLevel,
                  totalRequirements: scoped.totalRequirements,
                  completedRequirements: scoped.completedRequirements,
                  pendingRequirements: scoped.pendingRequirements,
                  averageRevisionCount: scoped.averageRevisionCount,
                  averageCommentCount: scoped.averageCommentCount,
                  averageAgingDays: scoped.averageAgingDays,
                  warningFlags: scoped.warningFlags
                }
              : null
          );
        } else {
          setSummary(summaryPayload.data);
        }
        setAvailablePrograms(programs);
        setAvailablePeriods([]);
        setAreas(areaPayload.data ?? []);
        setTrend(trendPayload.data ?? []);
        setForecast(forecastPayload.data?.forecast ?? []);
      } catch (loadError) {
        setSummary(null);
        setAreas([]);
        setTrend([]);
        setForecast([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load accreditation readiness data.");
      }
    }

    void load();
  }, [program, period, programs]);

  if (!summary) {
    return (
      <EmptyState
        title="No readiness data yet"
        message={error ?? dbMessage ?? "Import a CSV/XLSX dataset to populate the API."}
      />
    );
  }

  return (
    <div className="stack">
      <FilterBar programs={availablePrograms} periods={availablePeriods} />
      <LegendModalTrigger />
      <div className="grid cards">
        <SummaryCard
          label="Overall readiness"
          value={`${(summary.overallReadinessScore * 100).toFixed(1)}%`}
          hint="Institution-level readiness score"
        />
        <SummaryCard label="Status label" value={summary.readinessLabel} hint="Current accreditation posture" />
        <SummaryCard label="Requirements" value={summary.totalRequirements} hint="Tracked records in scope" />
        <SummaryCard
          label="Completed vs pending"
          value={`${summary.completedRequirements} / ${summary.pendingRequirements}`}
          hint="Delivery progress split"
        />
      </div>
      <div className="panel section">
        <div className="section-title">
          <h3>
            {program ? `${program} Status` : "Institution Status"}
            {period ? ` - ${period}` : ""}
          </h3>
          <RiskBadge riskLevel={summary.riskLevel} />
        </div>
        <div className="kpi-row">
          <div className="kpi">{program ? "Program scope" : `Programs: ${summary.totalPrograms ?? 0}`}</div>
          <div className="kpi">Avg revisions: {summary.averageRevisionCount}</div>
          <div className="kpi">Avg comments: {summary.averageCommentCount}</div>
          <div className="kpi">Avg aging days: {summary.averageAgingDays}</div>
        </div>
        <p className="muted">Warnings: {summary.warningFlags.length ? summary.warningFlags.join(", ") : "None"}</p>
        <p className="muted">Data source: API</p>
        {period ? <p className="muted">Academic period filtering is not available in API mode.</p> : null}
      </div>
      <div className="grid equal">
        <TrendChart data={trend} />
        <ForecastChart actual={trend.slice(-6)} forecast={forecast} />
      </div>
      <div className="stack">
        <div className="section-title">
          <h3>Area Comparison{period ? ` - ${period}` : ""}</h3>
        </div>
        <ReadinessTable rows={areas.slice(0, 12)} />
      </div>
    </div>
  );
}
