import { getDb } from "../lib/db";
import {
  aggregateAreaReadiness,
  aggregateInstitutionReadiness,
  aggregateProgramReadiness,
  toLightweightRecord,
  type LightweightRecord
} from "../lib/readinessEngine";

async function main() {
  const db = getDb();
  const records = await db.requirementRecord.findMany();
  const normalized: LightweightRecord[] = records.map(toLightweightRecord);

  const now = new Date();
  const institution = aggregateInstitutionReadiness(normalized);
  await db.readinessSnapshot.create({
    data: {
      snapshotDate: now,
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
        snapshotDate: now,
        program,
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
        snapshotDate: now,
        program: area.program ?? undefined,
        areaId: area.areaId ?? undefined,
        areaCode: area.areaCode ?? undefined,
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
