import { getDb } from "@/lib/db";
import { toLightweightRecord } from "@/lib/readinessEngine";
import { buildAcademicPeriodLabel, buildAcademicPeriodOrderFromLabel } from "@/lib/dateUtils";
import { buildScopedPeriodSeries, type ReadinessSeriesScope } from "@/lib/readinessSeries";

type RequirementRecord = Awaited<ReturnType<ReturnType<typeof getDb>["requirementRecord"]["findMany"]>>[number];
type ReadinessSnapshot = Awaited<ReturnType<ReturnType<typeof getDb>["readinessSnapshot"]["findMany"]>>[number];
export type ScopedPeriodSnapshot = {
  snapshotDate: Date;
  periodLabel: string;
  periodOrder: number;
  acadYear: string;
  semester: string;
  readinessScore: number;
  riskLevel: "Low" | "Medium" | "High";
};

function parseSourceBatchId(metadataJson: string | null) {
  if (!metadataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadataJson) as { sourceBatchId?: number };
    return typeof parsed.sourceBatchId === "number" ? parsed.sourceBatchId : null;
  } catch {
    return null;
  }
}

export async function getLatestImportBatchId() {
  const db = getDb();
  const latestBatch = await db.importBatch.findFirst({
    orderBy: { importedAt: "desc" },
    select: { id: true }
  });

  return latestBatch?.id ?? null;
}

export async function getLatestBatchRecords() {
  const db = getDb();
  const latestBatchId = await getLatestImportBatchId();
  if (latestBatchId == null) {
    return [];
  }

  return db.requirementRecord.findMany({
    where: { importBatchId: latestBatchId }
  });
}

export async function getLatestBatchSnapshots() {
  const db = getDb();
  const latestBatchId = await getLatestImportBatchId();
  if (latestBatchId == null) {
    return [];
  }

  const snapshots = await db.readinessSnapshot.findMany({
    orderBy: { snapshotDate: "asc" }
  });

  return snapshots.filter((snapshot) => parseSourceBatchId(snapshot.metadataJson) === latestBatchId);
}

export async function getLatestBatchScopedPeriodSnapshots(scope: ReadinessSeriesScope) {
  const records = (await getLatestBatchRecords()).map((record) => ({
    ...toLightweightRecord(record),
    acadYear: record.acadYear,
    semester: record.semester
  }));

  return buildScopedPeriodSeries(records, scope).map((snapshot) => ({
    ...snapshot
  })) satisfies ScopedPeriodSnapshot[];
}

export function filterRecordsByScope(
  records: RequirementRecord[],
  {
    program,
    period,
    areaId
  }: {
    program?: string | null;
    period?: string | null;
    areaId?: string | null;
  }
) {
  return records.filter((record) => {
    const matchesProgram = !program || record.program === program;
    const matchesPeriod = !period || buildAcademicPeriodLabel(record.acadYear, record.semester) === period;
    const matchesArea = !areaId || record.areaId === areaId;
    return matchesProgram && matchesPeriod && matchesArea;
  });
}

export function filterSnapshotsByScope(
  snapshots: ReadinessSnapshot[],
  {
    program,
    period,
    areaId
  }: {
    program?: string | null;
    period?: string | null;
    areaId?: string | null;
  }
) {
  const minPeriodOrder = period ? buildAcademicPeriodOrderFromLabel(period) : null;

  return snapshots.filter((snapshot) => {
    const matchesProgram = program ? snapshot.program === program : snapshot.program === null;
    const matchesArea = areaId ? snapshot.areaId === areaId : snapshot.areaId === null;
    const periodLabel =
      snapshot.acadYear && snapshot.semester ? buildAcademicPeriodLabel(snapshot.acadYear, snapshot.semester) : null;
    const periodOrder = periodLabel ? buildAcademicPeriodOrderFromLabel(periodLabel) : null;
    const matchesPeriod = minPeriodOrder == null || (periodOrder ?? 0) >= minPeriodOrder;

    return matchesProgram && matchesArea && matchesPeriod;
  });
}
