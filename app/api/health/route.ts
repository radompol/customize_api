import { getDbInitError, getDbSafely } from "@/lib/db";
import { apiSuccess } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  let database = "down";
  let reason: string | null = null;
  const db = getDbSafely();

  try {
    if (!db) {
      throw getDbInitError() ?? new Error("Prisma client is unavailable.");
    }
    await db.$queryRaw`SELECT 1`;
    database = "up";
  } catch (error) {
    database = "down";
    reason = error instanceof Error ? error.message : "Database unavailable";
  }

  return apiSuccess({
    data: {
      status: database === "up" ? "healthy" : "degraded",
      database,
      reason,
      timestamp: new Date().toISOString()
    }
  });
}
