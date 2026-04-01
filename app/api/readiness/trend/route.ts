import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { buildTrendSeries, toChartContract } from "@/lib/aggregation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  const { searchParams } = new URL(request.url);
  const program = searchParams.get("program");

  const snapshots = await db.readinessSnapshot.findMany({
    where: {
      program: program ?? null,
      areaId: null
    },
    orderBy: { snapshotDate: "asc" }
  });

  const series = buildTrendSeries(snapshots);

  return apiSuccess({
    data: series,
    chart: toChartContract(series)
  });
}
