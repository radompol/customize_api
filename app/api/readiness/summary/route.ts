import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { aggregateInstitutionReadiness, toLightweightRecord, type LightweightRecord } from "@/lib/readinessEngine";

export const runtime = "nodejs";

export async function GET() {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  try {
    const records = await db.requirementRecord.findMany();
    const normalized: LightweightRecord[] = records.map(toLightweightRecord);
    const summary = aggregateInstitutionReadiness(normalized);

    return apiSuccess({
      data: {
        overallReadinessScore: summary.readinessScore,
        readinessLabel: summary.readinessLabel,
        riskLevel: summary.riskLevel,
        totalPrograms: new Set(normalized.map((record) => record.program)).size,
        totalRequirements: summary.totalRequirements,
        completedRequirements: summary.completedRequirements,
        pendingRequirements: summary.pendingRequirements,
        averageRevisionCount: summary.averageRevisionCount,
        averageCommentCount: summary.averageCommentCount,
        averageAgingDays: summary.averageAgingDays,
        priorityLevel: summary.priorityLevel,
        warningFlags: summary.warningFlags
      }
    });
  } catch (error) {
    return apiError("Failed to load readiness summary.", 500, error instanceof Error ? error.message : error);
  }
}
