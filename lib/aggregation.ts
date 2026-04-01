import { resolveReadinessLabel, resolveRiskLevel } from "@/lib/riskRules";
import type { TrendPoint } from "@/models/readiness.types";

type SnapshotLike = {
  snapshotDate: Date;
  readinessScore: number;
  riskLevel?: string;
  periodLabel?: string;
  periodOrder?: number;
};

export function buildTrendSeries(snapshots: SnapshotLike[]): TrendPoint[] {
  return snapshots
    .slice()
    .sort((left, right) =>
      (left.periodOrder ?? left.snapshotDate.getTime()) - (right.periodOrder ?? right.snapshotDate.getTime())
    )
    .map((snapshot) => ({
      period: snapshot.periodLabel ?? snapshot.snapshotDate.toISOString().slice(0, 10),
      score: Number(snapshot.readinessScore.toFixed(4)),
      riskLevel: snapshot.riskLevel ?? resolveRiskLevel(snapshot.readinessScore)
    }));
}

export function toChartContract(points: TrendPoint[]) {
  return {
    labels: points.map((point) => point.period),
    series: points.map((point) => point.score)
  };
}

export function summarizeSnapshotMetrics(points: TrendPoint[]) {
  const current = points.at(-1);
  return {
    currentScore: current?.score ?? 0,
    readinessLabel: resolveReadinessLabel(current?.score ?? 0),
    riskLevel: current?.riskLevel ?? "High"
  };
}
