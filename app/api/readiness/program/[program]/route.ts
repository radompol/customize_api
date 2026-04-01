import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { aggregateAreaReadiness, aggregateProgramReadiness } from "@/lib/readinessEngine";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ program: string }> }) {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  const { program } = await params;
  const decodedProgram = decodeURIComponent(program);

  const records = await db.requirementRecord.findMany({
    where: { program: decodedProgram }
  });

  const normalized = records.map((record) => ({
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
  }));

  const summary = aggregateProgramReadiness(normalized);
  const areas = aggregateAreaReadiness(normalized);

  return apiSuccess({
    data: {
      program: decodedProgram,
      summary,
      areas
    }
  });
}
