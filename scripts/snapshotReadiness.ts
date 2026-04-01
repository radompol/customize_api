import { getDb } from "../lib/db";
import { buildAcademicPeriodDate } from "../lib/dateUtils";
import {
  aggregateAreaReadiness,
  aggregateInstitutionReadiness,
  aggregateProgramReadiness,
  toLightweightRecord,
  type LightweightRecord
} from "../lib/readinessEngine";

type SnapshotRecord = Awaited<ReturnType<ReturnType<typeof getDb>["requirementRecord"]["findMany"]>>[number];

function groupRecordsByAcademicPeriod(records: SnapshotRecord[]) {
  const groups = new Map<string, SnapshotRecord[]>();

  records.forEach((record) => {
    const key = `${record.acadYear}::${record.semester}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return Array.from(groups.entries()).map(([key, group]) => {
    const [acadYear, semester] = key.split("::");
    return { acadYear, semester, group };
  });
}

async function main() {
  const db = getDb();
  const records = await db.requirementRecord.findMany();

  for (const { acadYear, semester, group } of groupRecordsByAcademicPeriod(records)) {
    const normalized: LightweightRecord[] = group.map(toLightweightRecord);
    const snapshotDate = buildAcademicPeriodDate(acadYear, semester);

    const institution = aggregateInstitutionReadiness(normalized);
    await db.readinessSnapshot.create({
      data: {
        snapshotDate,
        acadYear,
        semester,
        readinessScore: institution.readinessScore,
        riskLevel: institution.riskLevel,
        readinessLabel: institution.readinessLabel,
        totalRequirements: institution.totalRequirements,
        completedRequirements: institution.completedRequirements,
        pendingRequirements: institution.pendingRequirements,
        averageRevisionCount: institution.averageRevisionCount,
        averageCommentCount: institution.averageCommentCount,
        averageAgingDays: institution.averageAgingDays
      }
    });

    for (const program of Array.from(new Set(normalized.map((record) => record.program)))) {
      const programRows = normalized.filter((record) => record.program === program);
      const metrics = aggregateProgramReadiness(programRows);
      await db.readinessSnapshot.create({
        data: {
          snapshotDate,
          program,
          acadYear,
          semester,
          readinessScore: metrics.readinessScore,
          riskLevel: metrics.riskLevel,
          readinessLabel: metrics.readinessLabel,
          totalRequirements: metrics.totalRequirements,
          completedRequirements: metrics.completedRequirements,
          pendingRequirements: metrics.pendingRequirements,
          averageRevisionCount: metrics.averageRevisionCount,
          averageCommentCount: metrics.averageCommentCount,
          averageAgingDays: metrics.averageAgingDays
        }
      });
    }

    for (const area of aggregateAreaReadiness(normalized)) {
      await db.readinessSnapshot.create({
        data: {
          snapshotDate,
          program: area.program ?? undefined,
          areaId: area.areaId ?? undefined,
          areaCode: area.areaCode ?? undefined,
          acadYear,
          semester,
          readinessScore: area.readinessScore,
          riskLevel: area.riskLevel,
          readinessLabel: area.readinessLabel,
          totalRequirements: area.totalRequirements,
          completedRequirements: area.completedRequirements,
          pendingRequirements: area.pendingRequirements,
          averageRevisionCount: area.averageRevisionCount,
          averageCommentCount: area.averageCommentCount,
          averageAgingDays: area.averageAgingDays
        }
      });
    }
  }

  console.log("Snapshots generated.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const db = getDb();
    await db.$disconnect();
  });
