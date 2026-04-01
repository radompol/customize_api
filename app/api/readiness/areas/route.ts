import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { aggregateAreaReadiness } from "@/lib/readinessEngine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  const { searchParams } = new URL(request.url);
  const program = searchParams.get("program");

  const records = await db.requirementRecord.findMany({
    where: program ? { program } : undefined
  });

  const areas = aggregateAreaReadiness(
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
    data: areas.sort((left, right) => left.readinessScore - right.readinessScore)
  });
}
