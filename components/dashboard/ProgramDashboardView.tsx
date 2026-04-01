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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const encoded = encodeURIComponent(program);

    async function load() {
      try {
        setError(null);
        const localSummary = await getIndexedDbSummary(program);
        const [localAreas, localTrend, localForecast] = await Promise.all([
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
      } catch (loadError) {
        try {
          const responses = await Promise.all([
            fetch(`/api/readiness/program/${encoded}`),
            fetch(`/api/readiness/trend?program=${encoded}`),
            fetch(`/api/readiness/forecast?program=${encoded}`)
          ]);
          const [programPayload, trendPayload, forecastPayload] = await Promise.all(
            responses.map((response) => response.json())
          );

          if (
            responses.some((response) => !response.ok) ||
            !programPayload.success ||
            !trendPayload.success ||
            !forecastPayload.success
          ) {
            throw new Error(
              programPayload.error ?? trendPayload.error ?? forecastPayload.error ?? "Accreditation API unavailable"
            );
          }

          setSummary(programPayload.data?.summary ?? null);
          setAreas(programPayload.data?.areas ?? []);
          setTrend(trendPayload.data ?? []);
          setForecast(forecastPayload.data?.forecast ?? []);
        } catch (apiError) {
          setSummary(null);
          setAreas([]);
          setTrend([]);
          setForecast([]);
          setError(apiError instanceof Error ? apiError.message : "Failed to load program readiness data.");
        }
      }
    }

    void load();
  }, [program]);

  if (!summary) {
    return <EmptyState title="No program data found" message={error ?? `No imported rows matched ${program}.`} />;
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
        <p className="muted">Data source: IndexedDB or API fallback</p>
      </div>
      <div className="grid equal">
        <TrendChart data={trend} />
        <ForecastChart actual={trend.slice(-6)} forecast={forecast} />
      </div>
      <ReadinessTable rows={areas} />
    </div>
  );
}
