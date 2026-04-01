import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { filterRecordsByScope, getLatestBatchRecords } from "@/lib/serverReadiness";
import { aggregateAreaReadiness, toLightweightRecord } from "@/lib/readinessEngine";

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
    const scopedRecords = filterRecordsByScope(records, { program, period, areaId });

    const areas = aggregateAreaReadiness(scopedRecords.map(toLightweightRecord));

    return apiSuccess({
      data: areas.sort((left, right) => left.readinessScore - right.readinessScore)
    });
  } catch (error) {
    return apiError("Failed to load readiness areas.", 500, error instanceof Error ? error.message : error);
  }
}
