import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { aggregateInstitutionReadiness } from "@/lib/readinessEngine";

export const runtime = "nodejs";

export async function GET() {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  const records = await db.requirementRecord.findMany();
  const summary = aggregateInstitutionReadiness(
    records.map((record) => ({
      program: record.program,
      areaId: record.areaId,
      areaCode: record.areaCode,
      areaDescription: record.areaDescription,
      assignedStatus: record.assignedStatus,
      latestFileStatus: record.latestFileStatus,
      hasFile: record.hasFile,
      reviseCount: record.reviseCount,
      nonEmptyComments: record.nonEmptyComments,
      daysSinceAssignment: record.daysSinceAssignment,
      daysOverdue: record.daysOverdue,
      isPendingFlag: record.isPendingFlag
    }))
  );

  return apiSuccess({
    data: {
      overallReadinessScore: summary.readinessScore,
      readinessLabel: summary.readinessLabel,
      riskLevel: summary.riskLevel,
      totalPrograms: new Set(records.map((record) => record.program)).size,
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
}
