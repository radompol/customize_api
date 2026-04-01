import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { buildAcademicPeriodLabel, buildAcademicPeriodOrder } from "@/lib/dateUtils";
import { filterRecordsByScope, getLatestBatchRecords } from "@/lib/serverReadiness";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  const { searchParams } = new URL(request.url);
  const program = searchParams.get("program");
  const areaId = searchParams.get("areaId");

  try {
    const records = filterRecordsByScope(await getLatestBatchRecords(), { program, areaId });

    const periods = Array.from(
      new Map(
        records.map((record) => {
          const label = buildAcademicPeriodLabel(record.acadYear, record.semester);
          const order = buildAcademicPeriodOrder(record.acadYear, record.semester);
          return [label, { label, order }];
        })
      ).values()
    )
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.label);

    return apiSuccess({
      data: periods
    });
  } catch (error) {
    return apiError("Failed to load academic periods.", 500, error instanceof Error ? error.message : error);
  }
}
