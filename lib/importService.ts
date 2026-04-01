import { getDb } from "@/lib/db";
import { parseCsvFile } from "@/lib/csvParser";
import { parseXlsxFile } from "@/lib/xlsxParser";
import { aggregateAreaReadiness, aggregateInstitutionReadiness, aggregateProgramReadiness } from "@/lib/readinessEngine";

async function createSnapshotsFromBatch(batchId: number) {
  const db = getDb();
  const records = await db.requirementRecord.findMany({ where: { importBatchId: batchId } });

  const normalized = records.map((record) => ({
    program: record.program,
    areaId: record.areaId,
    areaCode: record.areaCode,
    areaDescription: record.areaDescription,
    assignedStatus: record.assignedStatus,
    latestFileStatus: record.latestFileStatus,
    hasFile: record.hasFile,
    reviseCount: record.reviseCount,
    nonEmptyComments: record.nonEmptyComments,
    daysSinceAssignment: record.daysSinceAssignment,
    daysOverdue: record.daysOverdue,
    isPendingFlag: record.isPendingFlag
  }));

  const snapshotDate = new Date();
  let createdCount = 0;

  const institution = aggregateInstitutionReadiness(normalized);
  await db.readinessSnapshot.create({
    data: {
      snapshotDate,
      readinessScore: institution.readinessScore,
      riskLevel: institution.riskLevel,
      readinessLabel: institution.readinessLabel,
      totalRequirements: institution.totalRequirements,
      completedRequirements: institution.completedRequirements,
      pendingRequirements: institution.pendingRequirements,
      averageRevisionCount: institution.averageRevisionCount,
      averageCommentCount: institution.averageCommentCount,
      averageAgingDays: institution.averageAgingDays,
      metadataJson: JSON.stringify({ scope: "institution", sourceBatchId: batchId, warningFlags: institution.warningFlags })
    }
  });
  createdCount += 1;

  for (const program of Array.from(new Set(records.map((record) => record.program)))) {
    const metrics = aggregateProgramReadiness(normalized.filter((record) => record.program === program));
    await db.readinessSnapshot.create({
      data: {
        snapshotDate,
        program,
        readinessScore: metrics.readinessScore,
        riskLevel: metrics.riskLevel,
        readinessLabel: metrics.readinessLabel,
        totalRequirements: metrics.totalRequirements,
        completedRequirements: metrics.completedRequirements,
        pendingRequirements: metrics.pendingRequirements,
        averageRevisionCount: metrics.averageRevisionCount,
        averageCommentCount: metrics.averageCommentCount,
        averageAgingDays: metrics.averageAgingDays,
        metadataJson: JSON.stringify({ scope: "program", sourceBatchId: batchId, warningFlags: metrics.warningFlags })
      }
    });
    createdCount += 1;
  }

  for (const area of aggregateAreaReadiness(normalized)) {
    await db.readinessSnapshot.create({
      data: {
        snapshotDate,
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
        averageAgingDays: area.averageAgingDays,
        metadataJson: JSON.stringify({
          scope: "area",
          sourceBatchId: batchId,
          warningFlags: area.warningFlags,
          areaDescription: area.areaDescription
        })
      }
    });
    createdCount += 1;
  }

  return createdCount;
}

export async function importDataset(fileName: string, contentType: string, buffer: ArrayBuffer) {
  const db = getDb();
  const lowerName = fileName.toLowerCase();
  const parsed =
    lowerName.endsWith(".xlsx") || contentType.includes("spreadsheet")
      ? parseXlsxFile(buffer)
      : parseCsvFile(Buffer.from(buffer).toString("utf-8"));

  const batch = await db.importBatch.create({
    data: {
      fileName,
      fileType: lowerName.endsWith(".xlsx") ? "xlsx" : "csv",
      rowCount: parsed.rowCount,
      status: parsed.validRows.length ? "processing" : "failed",
      notes: parsed.errors.slice(0, 20).join(" | ") || null
    }
  });

  if (!parsed.validRows.length) {
    return { batchId: batch.id, rowsImported: 0, snapshotsCreated: 0, errors: parsed.errors };
  }

  await db.requirementRecord.createMany({
    data: parsed.validRows.map((row) => ({
      importBatchId: batch.id,
      apId: row.apId,
      program: row.program,
      acadYear: row.acadYear,
      semester: row.semester,
      areaId: row.areaId,
      areaCode: row.areaCode,
      areaDescription: row.areaDescription,
      instrumentId: row.instrumentId,
      requirementDescription: row.requirementDescription,
      assignedAt: row.assignedAt,
      assignedModifiedAt: row.assignedModifiedAt,
      assignedStatus: row.assignedStatus,
      approvedOrder: row.approvedOrder,
      latestUfId: row.latestUfId,
      latestFileUploadedAt: row.latestFileUploadedAt,
      latestFileVersion: row.latestFileVersion,
      latestFileStatus: row.latestFileStatus,
      latestFilename: row.latestFilename,
      latestFileExtension: row.latestFileExtension,
      hasFile: row.hasFile,
      totalFilesUploaded: row.totalFilesUploaded,
      totalStatusLogs: row.totalStatusLogs,
      reviseCount: row.reviseCount,
      replyCount: row.replyCount,
      totalComments: row.totalComments,
      nonEmptyComments: row.nonEmptyComments,
      daysSinceAssignment: row.daysSinceAssignment,
      daysSinceLatestUpload: row.daysSinceLatestUpload,
      isPendingFlag: row.isPendingFlag,
      deadlineDate: row.deadlineDate,
      submissionDate: row.submissionDate,
      daysToDeadline: row.daysToDeadline,
      daysOverdue: row.daysOverdue
    }))
  });

  const snapshotsCreated = await createSnapshotsFromBatch(batch.id);

  await db.importBatch.update({
    where: { id: batch.id },
    data: { status: "completed", notes: parsed.errors.slice(0, 20).join(" | ") || null }
  });

  return {
    batchId: batch.id,
    rowsImported: parsed.validRows.length,
    snapshotsCreated,
    errors: parsed.errors
  };
}
