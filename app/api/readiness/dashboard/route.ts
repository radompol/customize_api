import { apiError, apiSuccess } from "@/lib/api";
import { getDbInitError, getDbSafely } from "@/lib/db";
import { aggregateAreaReadiness, aggregateInstitutionReadiness, aggregateProgramReadiness, toLightweightRecord } from "@/lib/readinessEngine";
import { buildAcademicPeriodLabel, buildAcademicPeriodOrderFromLabel } from "@/lib/dateUtils";
import { buildScopedForecast, buildScopedTrend } from "@/lib/readinessSeries";
import { getLatestBatchRecords } from "@/lib/serverReadiness";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  const { searchParams } = new URL(request.url);
  const program = searchParams.get("program");
  const period = searchParams.get("period");
  const areaId = searchParams.get("areaId");

  try {
    const records = await getLatestBatchRecords();
    const summaryScoped = records.filter((record) => {
      const matchesProgram = !program || record.program === program;
      const matchesPeriod = !period || buildAcademicPeriodLabel(record.acadYear, record.semester) === period;
      const matchesArea = !areaId || record.areaId === areaId;
      return matchesProgram && matchesPeriod && matchesArea;
    });
    const optionScoped = program ? records.filter((record) => record.program === program) : records;
    const normalizedSummary = summaryScoped.map(toLightweightRecord);
    const summaryMetrics = program
      ? aggregateProgramReadiness(normalizedSummary)
      : aggregateInstitutionReadiness(normalizedSummary);

    return apiSuccess({
      programs: Array.from(new Set(records.map((record) => record.program))).sort((left, right) => left.localeCompare(right)),
      periods: Array.from(new Set(optionScoped.map((record) => buildAcademicPeriodLabel(record.acadYear, record.semester)))).sort(
        (left, right) => (buildAcademicPeriodOrderFromLabel(left) ?? 0) - (buildAcademicPeriodOrderFromLabel(right) ?? 0)
      ),
      areas: Array.from(
        new Map(
          optionScoped.map((record) => {
            const id = record.areaId || record.areaCode;
            const label = [record.areaCode, record.areaDescription].filter(Boolean).join(" - ") || id;
            return [label, { id, label }];
          })
        ).values()
      ).filter((entry): entry is { id: string; label: string } => Boolean(entry.id)),
      summary: {
        overallReadinessScore: summaryMetrics.readinessScore,
        readinessLabel: summaryMetrics.readinessLabel,
        riskLevel: summaryMetrics.riskLevel,
        totalPrograms: new Set(records.map((record) => record.program)).size,
        totalRequirements: summaryMetrics.totalRequirements,
        completedRequirements: summaryMetrics.completedRequirements,
        pendingRequirements: summaryMetrics.pendingRequirements,
        averageRevisionCount: summaryMetrics.averageRevisionCount,
        averageCommentCount: summaryMetrics.averageCommentCount,
        averageAgingDays: summaryMetrics.averageAgingDays,
        priorityLevel: summaryMetrics.priorityLevel,
        warningFlags: summaryMetrics.warningFlags
      },
      areaRows: aggregateAreaReadiness(normalizedSummary).sort((left, right) => left.readinessScore - right.readinessScore),
      trend: buildScopedTrend(records, { program, period, areaId }),
      forecast: await buildScopedForecast(records, { program, period, areaId })
    });
  } catch (error) {
    return apiError("Failed to load dashboard readiness data.", 500, error instanceof Error ? error.message : error);
  }
}
