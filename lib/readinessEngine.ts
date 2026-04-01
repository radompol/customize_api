import { SCORE_WEIGHTS, STATUS_CONFIG } from "@/lib/constants";
import { resolvePriorityLevel, resolveReadinessLabel, resolveRiskLevel } from "@/lib/riskRules";
import type { ReadinessAreaRow, ReadinessMetrics } from "@/models/readiness.types";

type LightweightRecord = {
  program: string;
  areaId: string | null;
  areaCode: string | null;
  areaDescription: string | null;
  assignedStatus: string | null;
  latestFileStatus: string | null;
  hasFile: boolean;
  reviseCount: number;
  nonEmptyComments: number;
  daysSinceAssignment: number | null;
  daysOverdue?: number | null;
  isPendingFlag: boolean;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getStatusBucket(status: string | null) {
  const normalized = (status ?? "").trim().toLowerCase();
  if (STATUS_CONFIG.approved.some((entry) => normalized.includes(entry))) return "approved";
  if (STATUS_CONFIG.revise.some((entry) => normalized.includes(entry))) return "revise";
  if (STATUS_CONFIG.pending.some((entry) => normalized.includes(entry))) return "pending";
  return "unknown";
}

export function computeRequirementScore(record: LightweightRecord) {
  const completion = record.hasFile ? 1 : 0.2;
  const statusBucket = getStatusBucket(record.latestFileStatus ?? record.assignedStatus);
  const statusScore =
    statusBucket === "approved" ? 1 : statusBucket === "pending" ? 0.55 : statusBucket === "revise" ? 0.25 : 0.45;
  const qualityScore = clamp(1 - record.reviseCount * 0.12 - record.nonEmptyComments * 0.03);
  const agingScore = clamp(1 - (record.daysSinceAssignment ?? 0) / 180);
  const hasTimeline = record.daysOverdue != null;
  const timelineScore = hasTimeline ? clamp(1 - Math.max(record.daysOverdue ?? 0, 0) / 60) : null;

  const weights = { ...SCORE_WEIGHTS };
  if (!hasTimeline) {
    const totalWithoutTimeline = weights.completion + weights.status + weights.quality + weights.aging;
    weights.completion /= totalWithoutTimeline;
    weights.status /= totalWithoutTimeline;
    weights.quality /= totalWithoutTimeline;
    weights.aging /= totalWithoutTimeline;
    weights.timeline = 0;
  }

  return clamp(
    completion * weights.completion +
      statusScore * weights.status +
      qualityScore * weights.quality +
      agingScore * weights.aging +
      (timelineScore ?? 0) * weights.timeline
  );
}

function buildMetrics(records: LightweightRecord[]): ReadinessMetrics {
  const totalRequirements = records.length;
  const completedRequirements = records.filter((record) => computeRequirementScore(record) >= 0.7).length;
  const pendingRequirements = records.filter((record) => record.isPendingFlag).length;
  const averageRevisionCount =
    totalRequirements === 0 ? 0 : records.reduce((sum, record) => sum + record.reviseCount, 0) / totalRequirements;
  const averageCommentCount =
    totalRequirements === 0
      ? 0
      : records.reduce((sum, record) => sum + record.nonEmptyComments, 0) / totalRequirements;
  const averageAgingDays =
    totalRequirements === 0
      ? 0
      : records.reduce((sum, record) => sum + (record.daysSinceAssignment ?? 0), 0) / totalRequirements;
  const readinessScore =
    totalRequirements === 0
      ? 0
      : records.reduce((sum, record) => sum + computeRequirementScore(record), 0) / totalRequirements;
  const riskLevel = resolveRiskLevel(readinessScore);
  const readinessLabel = resolveReadinessLabel(readinessScore);
  const priorityLevel = resolvePriorityLevel(readinessScore);

  const warningFlags = [
    pendingRequirements / Math.max(totalRequirements, 1) > 0.35 ? "High pending burden" : null,
    averageRevisionCount > 2 ? "High revision churn" : null,
    averageCommentCount > 4 ? "Heavy comment burden" : null,
    averageAgingDays > 90 ? "Aging requirements" : null
  ].filter(Boolean) as string[];

  return {
    readinessScore: Number(readinessScore.toFixed(4)),
    readinessLabel,
    riskLevel,
    priorityLevel,
    warningFlags,
    totalRequirements,
    completedRequirements,
    pendingRequirements,
    averageRevisionCount: Number(averageRevisionCount.toFixed(2)),
    averageCommentCount: Number(averageCommentCount.toFixed(2)),
    averageAgingDays: Number(averageAgingDays.toFixed(2))
  };
}

export function aggregateAreaReadiness(records: LightweightRecord[]): ReadinessAreaRow[] {
  const groups = new Map<string, LightweightRecord[]>();

  records.forEach((record) => {
    const key = `${record.program}::${record.areaId ?? "none"}::${record.areaCode ?? "none"}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return Array.from(groups.values()).map((group) => ({
    areaId: group[0].areaId,
    areaCode: group[0].areaCode,
    areaDescription: group[0].areaDescription,
    program: group[0].program,
    ...buildMetrics(group)
  }));
}

export function aggregateProgramReadiness(records: LightweightRecord[]) {
  return buildMetrics(records);
}

export function aggregateInstitutionReadiness(records: LightweightRecord[]) {
  return buildMetrics(records);
}
