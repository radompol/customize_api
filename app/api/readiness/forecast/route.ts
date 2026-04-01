import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { predictNextPeriods } from "@/lib/forecasting";
import { resolvePeriodDate } from "@/lib/dateUtils";
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
  const persist = searchParams.get("persist");

  try {
    const forecast = await predictNextPeriods(await getLatestBatchScopedPeriodSnapshots({ program, period, areaId }));

    if (persist === "1" || persist === "true") {
      const run = await db.forecastRun.create({
        data: {
          targetScope: areaId ? "area" : program ? "program" : "institution",
          targetProgram: program,
          targetAreaId: areaId,
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
            forecastDate: resolvePeriodDate(point.period),
            targetScope: areaId ? "area" : program ? "program" : "institution",
            targetProgram: program,
            targetAreaId: areaId,
            predictedReadinessScore: point.score,
            predictedRiskLevel: point.riskLevel,
            trendDirection: forecast.trendDirection,
            confidenceNote: forecast.confidenceNote
          }))
        });
      }
    }

    return apiSuccess({
      data: {
        program: program ?? "Institution",
        areaId,
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
  } catch (error) {
    return apiError("Failed to load readiness forecast.", 500, error instanceof Error ? error.message : error);
  }
}
