import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const db = getDbSafely();
  if (!db) {
    return apiError('Prisma client is not ready. Run "npx prisma generate" first.', 503, getDbInitError()?.message);
  }

  try {
    const programs = await db.requirementRecord.findMany({
      distinct: ["program"],
      select: { program: true },
      orderBy: { program: "asc" }
    });

    return apiSuccess({
      data: programs.map((entry) => entry.program)
    });
  } catch (error) {
    return apiError("Failed to load readiness programs.", 500, error instanceof Error ? error.message : error);
  }
}
