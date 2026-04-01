import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { aggregateAreaReadiness, aggregateProgramReadiness, toLightweightRecord } from "@/lib/readinessEngine";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ program: string }> }) {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  try {
    const { program } = await params;
    const decodedProgram = decodeURIComponent(program);

    const records = await db.requirementRecord.findMany({
      where: { program: decodedProgram }
    });

    const normalized = records.map(toLightweightRecord);

    const summary = aggregateProgramReadiness(normalized);
    const areas = aggregateAreaReadiness(normalized);

    return apiSuccess({
      data: {
        program: decodedProgram,
        summary,
        areas
      }
    });
  } catch (error) {
    return apiError("Failed to load program readiness.", 500, error instanceof Error ? error.message : error);
  }
}
