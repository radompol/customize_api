import { getDb } from "../lib/db";

async function main() {
  const db = getDb();
  const batch = await db.importBatch.create({
    data: {
      fileName: "seed.csv",
      fileType: "csv",
      rowCount: 3,
      status: "completed",
      notes: "Seed batch"
    }
  });

  await db.requirementRecord.createMany({
    data: [
      {
        importBatchId: batch.id,
        apId: "1",
        program: "BS Information Technology",
        acadYear: "2025-2026",
        semester: "1st",
        areaId: "A1",
        areaCode: "Area I",
        areaDescription: "Vision and Mission",
        instrumentId: "INST-1",
        requirementDescription: "Mission document",
        hasFile: true,
        assignedStatus: "approved",
        latestFileStatus: "approved",
        totalFilesUploaded: 1,
        totalStatusLogs: 1,
        reviseCount: 0,
        replyCount: 0,
        totalComments: 0,
        nonEmptyComments: 0,
        daysSinceAssignment: 14,
        isPendingFlag: false
      },
      {
        importBatchId: batch.id,
        apId: "2",
        program: "BS Information Technology",
        acadYear: "2025-2026",
        semester: "1st",
        areaId: "A2",
        areaCode: "Area II",
        areaDescription: "Faculty",
        instrumentId: "INST-2",
        requirementDescription: "Faculty profile",
        hasFile: true,
        assignedStatus: "pending",
        latestFileStatus: "pending",
        totalFilesUploaded: 1,
        totalStatusLogs: 2,
        reviseCount: 1,
        replyCount: 1,
        totalComments: 2,
        nonEmptyComments: 2,
        daysSinceAssignment: 38,
        isPendingFlag: true
      },
      {
        importBatchId: batch.id,
        apId: "3",
        program: "BS Education",
        acadYear: "2025-2026",
        semester: "1st",
        areaId: "A1",
        areaCode: "Area I",
        areaDescription: "Vision and Mission",
        instrumentId: "INST-3",
        requirementDescription: "Program outcomes",
        hasFile: false,
        assignedStatus: "revise",
        latestFileStatus: "needs revision",
        totalFilesUploaded: 0,
        totalStatusLogs: 3,
        reviseCount: 2,
        replyCount: 1,
        totalComments: 4,
        nonEmptyComments: 4,
        daysSinceAssignment: 92,
        isPendingFlag: true
      }
    ]
  });

  console.log("Seed records inserted. Run import or snapshot creation next.");
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
