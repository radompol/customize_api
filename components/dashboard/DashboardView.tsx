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
import {
  getIndexedDbDashboardData,
} from "@/lib/indexedDb";
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
type AreaOption = { id: string; key: string; label: string };

export function DashboardView({ programs, dbMessage }: { programs: string[]; dbMessage?: string | null }) {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") === "live" ? "live" : "indexeddb";
  const program = searchParams.get("program");
  const period = searchParams.get("period");
  const areaId = searchParams.get("areaId");
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(programs);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [availableAreas, setAvailableAreas] = useState<AreaOption[]>([]);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [areas, setAreas] = useState<ReadinessAreaRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const readinessParams = new URLSearchParams();
    if (program) {
      readinessParams.set("program", program);
    }
    if (period) {
      readinessParams.set("period", period);
    }
    if (areaId) {
      readinessParams.set("areaId", areaId);
    }

    const areaQuery = readinessParams.toString() ? `?${readinessParams.toString()}` : "";
    const summaryParams = new URLSearchParams();
    if (period) {
      summaryParams.set("period", period);
    }
    if (areaId) {
      summaryParams.set("areaId", areaId);
    }
    const summaryQuery = summaryParams.toString() ? `?${summaryParams.toString()}` : "";
    const summaryEndpoint = program
      ? `/api/readiness/program/${encodeURIComponent(program)}${summaryQuery}`
      : `/api/readiness/summary${summaryQuery}`;
    const optionParams = new URLSearchParams();
    if (program) {
      optionParams.set("program", program);
    }
    const optionQuery = optionParams.toString() ? `?${optionParams.toString()}` : "";
    const metricParams = new URLSearchParams();
    if (program) {
      metricParams.set("program", program);
    }
    if (period) {
      metricParams.set("period", period);
    }
    if (areaId) {
      metricParams.set("areaId", areaId);
    }
    const metricQuery = metricParams.toString() ? `?${metricParams.toString()}` : "";

    async function load() {
      try {
        setError(null);
        if (source === "indexeddb") {
          const localDashboard = await getIndexedDbDashboardData(program, period, areaId);
          if (!localDashboard.programs.length) {
            throw new Error("No IndexedDB dataset available.");
          }

          setSummary(localDashboard.summary);
          setAvailablePrograms(localDashboard.programs);
          setAvailablePeriods(localDashboard.periods);
          setAvailableAreas(localDashboard.areas.map((area) => ({ ...area, key: `${area.id}-${area.label}` })));
          setAreas(localDashboard.areaRows);
          setTrend(localDashboard.trend);
          setForecast(localDashboard.forecast.forecast);
          return;
        }

        const response = await fetch(`/api/readiness/dashboard${metricQuery}`);
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload?.error ?? "Accreditation API unavailable");
        }

        setSummary(payload.summary ?? null);
        setAvailablePrograms(payload.programs ?? programs);
        setAvailablePeriods(payload.periods ?? []);
        setAvailableAreas(
          Array.from(
            new Map<string, AreaOption>(
              (payload.areas ?? []).map((area: { id: string; label: string }) => {
                const dedupeKey = `${area.id}::${area.label}`;
                return [dedupeKey, { id: area.id, key: dedupeKey, label: area.label }];
              })
            ).values()
          )
        );
        setAreas(payload.areaRows ?? []);
        setTrend(payload.trend ?? []);
        setForecast(payload.forecast?.forecast ?? []);
      } catch (loadError) {
        setSummary(null);
        setAreas([]);
        setTrend([]);
        setForecast([]);
        setAvailableAreas([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load accreditation readiness data.");
      }
    }

    void load();
  }, [source, program, period, areaId, programs]);

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
      <FilterBar programs={availablePrograms} periods={availablePeriods} areas={availableAreas} source={source} />
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
        <p className="muted">Data source: {source === "live" ? "API" : "IndexedDB"}</p>
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
