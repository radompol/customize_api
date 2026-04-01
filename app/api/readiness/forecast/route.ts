import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { predictNextPeriods, toSnapshotSeries } from "@/lib/forecasting";

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

  const forecast = await predictNextPeriods(snapshots.map(toSnapshotSeries));

  const run = await db.forecastRun.create({
    data: {
      targetScope: program ? "program" : "institution",
      targetProgram: program,
      modelVersion: `v1-${forecast.modelMeta.mode}`,
      periodsUsed: forecast.modelMeta.seriesLength,
      lossValue: forecast.modelMeta.lossValue,
      notes: forecast.confidenceNote
    }
  });

  if (forecast.forecast.length) {
    await db.forecastPrediction.createMany({
      data: forecast.forecast.map((point) => ({
        forecastRunId: run.id,
        forecastDate: new Date(`${point.period}-01T00:00:00.000Z`),
        targetScope: program ? "program" : "institution",
        targetProgram: program,
        predictedReadinessScore: point.score,
        predictedRiskLevel: point.riskLevel,
        trendDirection: forecast.trendDirection,
        confidenceNote: forecast.confidenceNote
      }))
    });
  }

  return apiSuccess({
    data: {
      program: program ?? "Institution",
      currentScore: forecast.currentScore,
      forecast: forecast.forecast,
      trendDirection: forecast.trendDirection,
      confidenceNote: forecast.confidenceNote,
      modelMeta: forecast.modelMeta
    },
    chart: {
      labels: forecast.forecast.map((point) => point.period),
      series: forecast.forecast.map((point) => point.score)
    }
  });
}
