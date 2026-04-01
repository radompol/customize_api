"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ForecastChart } from "@/components/ForecastChart";
import { ReadinessTable } from "@/components/ReadinessTable";
import { RiskBadge } from "@/components/RiskBadge";
import { SummaryCard } from "@/components/SummaryCard";
import { TrendChart } from "@/components/TrendChart";
import { getIndexedDbAreas, getIndexedDbForecast, getIndexedDbSummary, getIndexedDbTrend } from "@/lib/indexedDb";
import type { ReadinessAreaRow, ReadinessMetrics } from "@/models/readiness.types";

type TrendPoint = { period: string; score: number; riskLevel: string };
type ForecastPoint = { period: string; score: number; riskLevel: string };

export function ProgramDashboardView({ program }: { program: string }) {
  const [summary, setSummary] = useState<ReadinessMetrics | null>(null);
  const [areas, setAreas] = useState<ReadinessAreaRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [sourceLabel, setSourceLabel] = useState<"api" | "indexeddb" | null>(null);

  useEffect(() => {
    const encoded = encodeURIComponent(program);

    async function load() {
      try {
        const [programPayload, trendPayload, forecastPayload] = await Promise.all([
          fetch(`/api/readiness/program/${encoded}`).then((response) => response.json()),
          fetch(`/api/readiness/trend?program=${encoded}`).then((response) => response.json()),
          fetch(`/api/readiness/forecast?program=${encoded}`).then((response) => response.json())
        ]);

        if (!programPayload.success || !trendPayload.success || !forecastPayload.success) {
          throw new Error("API unavailable");
        }

        setSummary(programPayload.data?.summary ?? null);
        setAreas(programPayload.data?.areas ?? []);
        setTrend(trendPayload.data ?? []);
        setForecast(forecastPayload.data?.forecast ?? []);
        setSourceLabel("api");
      } catch {
        const [localSummary, localAreas, localTrend, localForecast] = await Promise.all([
          getIndexedDbSummary(program),
          getIndexedDbAreas(program),
          getIndexedDbTrend(program),
          getIndexedDbForecast(program)
        ]);

        setSummary({
          readinessScore: localSummary.overallReadinessScore,
          readinessLabel: localSummary.readinessLabel,
          riskLevel: localSummary.riskLevel as ReadinessMetrics["riskLevel"],
          priorityLevel: localSummary.priorityLevel as ReadinessMetrics["priorityLevel"],
          warningFlags: localSummary.warningFlags,
          totalRequirements: localSummary.totalRequirements,
          completedRequirements: localSummary.completedRequirements,
          pendingRequirements: localSummary.pendingRequirements,
          averageRevisionCount: localSummary.averageRevisionCount,
          averageCommentCount: localSummary.averageCommentCount,
          averageAgingDays: localSummary.averageAgingDays
        });
        setAreas(localAreas);
        setTrend(localTrend);
        setForecast(localForecast.forecast);
        setSourceLabel("indexeddb");
      }
    }

    void load();
  }, [program]);

  if (!summary) {
    return <EmptyState title="No program data found" message={`No imported rows matched ${program}.`} />;
  }

  return (
    <div className="stack">
      <div className="grid cards">
        <SummaryCard label="Program" value={program} hint="Selected dashboard scope" />
        <SummaryCard
          label="Readiness score"
          value={`${(summary.readinessScore * 100).toFixed(1)}%`}
          hint="Weighted program score"
        />
        <SummaryCard label="Requirements" value={summary.totalRequirements} hint="Records included in this view" />
        <SummaryCard label="Priority" value={summary.priorityLevel} hint="Recommended attention level" />
      </div>
      <div className="panel section">
        <div className="section-title">
          <h3>{summary.readinessLabel}</h3>
          <RiskBadge riskLevel={summary.riskLevel} />
        </div>
        <div className="kpi-row">
          <div className="kpi">Completed: {summary.completedRequirements}</div>
          <div className="kpi">Pending: {summary.pendingRequirements}</div>
          <div className="kpi">Avg revisions: {summary.averageRevisionCount}</div>
          <div className="kpi">Avg comments: {summary.averageCommentCount}</div>
        </div>
        <p className="muted">Data source: {sourceLabel === "indexeddb" ? "IndexedDB (local browser storage)" : "API"}</p>
      </div>
      <div className="grid equal">
        <TrendChart data={trend} />
        <ForecastChart actual={trend.slice(-6)} forecast={forecast} />
      </div>
      <ReadinessTable rows={areas} />
    </div>
  );
}
