import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { buildTrendSeries, toChartContract } from "@/lib/aggregation";
import { getLatestBatchScopedPeriodSnapshots } from "@/lib/serverReadiness";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  const { searchParams } = new URL(request.url);
  const program = searchParams.get("program");
  const areaId = searchParams.get("areaId");
  const period = searchParams.get("period");

  try {
    const series = buildTrendSeries(await getLatestBatchScopedPeriodSnapshots({ program, period, areaId }));

    return apiSuccess({
      data: series,
      chart: toChartContract(series)
    });
  } catch (error) {
    return apiError("Failed to load readiness trend.", 500, error instanceof Error ? error.message : error);
  }
}
