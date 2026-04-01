import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { getLatestBatchRecords } from "@/lib/serverReadiness";

export const runtime = "nodejs";

export async function GET() {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  try {
    const records = await getLatestBatchRecords();
    const programs = Array.from(new Set(records.map((record) => record.program))).sort((left, right) =>
      left.localeCompare(right)
    );

    return apiSuccess({
      data: programs
    });
  } catch (error) {
    return apiError("Failed to load readiness programs.", 500, error instanceof Error ? error.message : error);
  }
}
