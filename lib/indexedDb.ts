"use client";

import { parseCsvFile } from "@/lib/csvParser";
import { parseXlsxFile } from "@/lib/xlsxParser";
import { aggregateAreaReadiness, aggregateInstitutionReadiness, aggregateProgramReadiness } from "@/lib/readinessEngine";
import { buildTrendSeries } from "@/lib/aggregation";
import { buildAcademicPeriodLabel, buildAcademicPeriodOrder } from "@/lib/dateUtils";
import { predictNextPeriods } from "@/lib/forecasting";
import type { RequirementRecordInput } from "@/models/dataset.types";

const DB_NAME = "accreditation-readiness-local";
const DB_VERSION = 2;
const BATCH_STORE = "import_batches";
const RECORD_STORE = "requirement_records";
const SNAPSHOT_STORE = "readiness_snapshots";

type LocalBatch = {
  id: number;
  fileName: string;
  fileType: string;
  importedAt: string;
  rowCount: number;
  status: string;
  notes: string | null;
};

type LocalRecord = RequirementRecordInput & {
  id: string;
  importBatchId: number;
  createdAt: string;
  updatedAt: string;
};

type LocalSnapshot = {
  id: string;
  snapshotDate: string;
  program: string | null;
  areaId: string | null;
  areaCode: string | null;
  acadYear: string | null;
  semester: string | null;
  periodLabel: string | null;
  periodOrder: number | null;
  readinessScore: number;
  riskLevel: string;
  readinessLabel: string;
  totalRequirements: number;
  completedRequirements: number;
  pendingRequirements: number;
  averageRevisionCount: number;
  averageCommentCount: number;
  averageAgingDays: number;
  metadataJson: string | null;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(BATCH_STORE)) {
        db.deleteObjectStore(BATCH_STORE);
      }
      if (db.objectStoreNames.contains(RECORD_STORE)) {
        db.deleteObjectStore(RECORD_STORE);
      }
      if (db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.deleteObjectStore(SNAPSHOT_STORE);
      }
      if (!db.objectStoreNames.contains(BATCH_STORE)) {
        db.createObjectStore(BATCH_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(RECORD_STORE)) {
        db.createObjectStore(RECORD_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve((request.result ?? []) as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function putMany(storeName: string, values: unknown[]) {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  values.forEach((value) => store.put(value));
  await txComplete(tx);
}

function normalizeRecords(records: Array<LocalRecord | RequirementRecordInput>) {
  return records.map((record) => ({
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
}

function groupByAcademicPeriod(rows: RequirementRecordInput[]) {
  const groups = new Map<string, RequirementRecordInput[]>();

  rows.forEach((row) => {
    const key = `${row.acadYear}::${row.semester}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return Array.from(groups.entries())
    .map(([key, scopedRows]) => {
      const [acadYear, semester] = key.split("::");
      return {
        acadYear,
        semester,
        periodLabel: buildAcademicPeriodLabel(acadYear, semester),
        periodOrder: buildAcademicPeriodOrder(acadYear, semester),
        rows: scopedRows
      };
    })
    .sort((left, right) => left.periodOrder - right.periodOrder);
}

function createSnapshotRows(batchId: number, rows: RequirementRecordInput[]) {
  const now = new Date().toISOString();
  const snapshots: LocalSnapshot[] = [];
  const periods = groupByAcademicPeriod(rows);

  periods.forEach((period, periodIndex) => {
    const normalized = normalizeRecords(period.rows);
    const institution = aggregateInstitutionReadiness(normalized);
    snapshots.push({
      id: `institution-${batchId}-${periodIndex}`,
      snapshotDate: now,
      program: null,
      areaId: null,
      areaCode: null,
      acadYear: period.acadYear,
      semester: period.semester,
      periodLabel: period.periodLabel,
      periodOrder: period.periodOrder,
      readinessScore: institution.readinessScore,
      riskLevel: institution.riskLevel,
      readinessLabel: institution.readinessLabel,
      totalRequirements: institution.totalRequirements,
      completedRequirements: institution.completedRequirements,
      pendingRequirements: institution.pendingRequirements,
      averageRevisionCount: institution.averageRevisionCount,
      averageCommentCount: institution.averageCommentCount,
      averageAgingDays: institution.averageAgingDays,
      metadataJson: JSON.stringify({
        scope: "institution",
        sourceBatchId: batchId,
        warningFlags: institution.warningFlags
      }),
      createdAt: now
    });

    const programs = Array.from(new Set(period.rows.map((row) => row.program)));
    programs.forEach((program) => {
      const metrics = aggregateProgramReadiness(
        normalizeRecords(period.rows.filter((row) => row.program === program))
      );
      snapshots.push({
        id: `program-${batchId}-${periodIndex}-${program}`,
        snapshotDate: now,
        program,
        areaId: null,
        areaCode: null,
        acadYear: period.acadYear,
        semester: period.semester,
        periodLabel: period.periodLabel,
        periodOrder: period.periodOrder,
        readinessScore: metrics.readinessScore,
        riskLevel: metrics.riskLevel,
        readinessLabel: metrics.readinessLabel,
        totalRequirements: metrics.totalRequirements,
        completedRequirements: metrics.completedRequirements,
        pendingRequirements: metrics.pendingRequirements,
        averageRevisionCount: metrics.averageRevisionCount,
        averageCommentCount: metrics.averageCommentCount,
        averageAgingDays: metrics.averageAgingDays,
        metadataJson: JSON.stringify({ scope: "program", sourceBatchId: batchId, warningFlags: metrics.warningFlags }),
        createdAt: now
      });
    });

    aggregateAreaReadiness(normalized).forEach((area, index) => {
      snapshots.push({
        id: `area-${batchId}-${periodIndex}-${index}`,
        snapshotDate: now,
        program: area.program,
        areaId: area.areaId,
        areaCode: area.areaCode,
        acadYear: period.acadYear,
        semester: period.semester,
        periodLabel: period.periodLabel,
        periodOrder: period.periodOrder,
        readinessScore: area.readinessScore,
        riskLevel: area.riskLevel,
        readinessLabel: area.readinessLabel,
        totalRequirements: area.totalRequirements,
        completedRequirements: area.completedRequirements,
        pendingRequirements: area.pendingRequirements,
        averageRevisionCount: area.averageRevisionCount,
        averageCommentCount: area.averageCommentCount,
        averageAgingDays: area.averageAgingDays,
        metadataJson: JSON.stringify({ scope: "area", sourceBatchId: batchId, warningFlags: area.warningFlags }),
        createdAt: now
      });
    });
  });

  return snapshots;
}

export async function saveImportToIndexedDb(file: File) {
  const extension = file.name.toLowerCase();
  const parsed =
    extension.endsWith(".xlsx")
      ? parseXlsxFile(await file.arrayBuffer())
      : parseCsvFile(await file.text());

  const batchId = Date.now();
  const importedAt = new Date().toISOString();

  const batch: LocalBatch = {
    id: batchId,
    fileName: file.name,
    fileType: extension.endsWith(".xlsx") ? "xlsx" : "csv",
    importedAt,
    rowCount: parsed.rowCount,
    status: parsed.validRows.length ? "completed" : "failed",
    notes: parsed.errors.slice(0, 20).join(" | ") || null
  };

  const records: LocalRecord[] = parsed.validRows.map((row, index) => ({
    ...row,
    id: `${batchId}-${index}`,
    importBatchId: batchId,
    createdAt: importedAt,
    updatedAt: importedAt
  }));

  const snapshots = createSnapshotRows(batchId, parsed.validRows);

  await putMany(BATCH_STORE, [batch]);
  if (records.length) {
    await putMany(RECORD_STORE, records);
  }
  if (snapshots.length) {
    await putMany(SNAPSHOT_STORE, snapshots);
  }

  window.dispatchEvent(new CustomEvent("indexeddb-import-complete"));

  return {
    batchId,
    rowsImported: records.length,
    snapshotsCreated: snapshots.length,
    errors: parsed.errors
  };
}

export async function getIndexedDbBatches() {
  const batches = await getAll<LocalBatch>(BATCH_STORE);
  return batches.sort((left, right) => right.id - left.id);
}

export async function getIndexedDbPrograms() {
  const records = await getAll<LocalRecord>(RECORD_STORE);
  return Array.from(new Set(records.map((record) => record.program))).sort((left, right) => left.localeCompare(right));
}

export async function getIndexedDbPeriods(program?: string | null) {
  const records = await getAll<LocalRecord>(RECORD_STORE);
  const scoped = program ? records.filter((record) => record.program === program) : records;
  return Array.from(new Set(scoped.map((record) => buildAcademicPeriodLabel(record.acadYear, record.semester)))).sort();
}

function matchesPeriod(record: LocalRecord, period?: string | null) {
  if (!period) {
    return true;
  }
  return buildAcademicPeriodLabel(record.acadYear, record.semester) === period;
}

export async function getIndexedDbSummary(program?: string | null, period?: string | null) {
  const records = await getAll<LocalRecord>(RECORD_STORE);
  const scoped = records.filter((record) => (!program || record.program === program) && matchesPeriod(record, period));
  const normalized = normalizeRecords(scoped);
  const metrics = program ? aggregateProgramReadiness(normalized) : aggregateInstitutionReadiness(normalized);

  return {
    overallReadinessScore: metrics.readinessScore,
    readinessLabel: metrics.readinessLabel,
    riskLevel: metrics.riskLevel,
    totalPrograms: new Set(records.map((record) => record.program)).size,
    totalRequirements: metrics.totalRequirements,
    completedRequirements: metrics.completedRequirements,
    pendingRequirements: metrics.pendingRequirements,
    averageRevisionCount: metrics.averageRevisionCount,
    averageCommentCount: metrics.averageCommentCount,
    averageAgingDays: metrics.averageAgingDays,
    priorityLevel: metrics.priorityLevel,
    warningFlags: metrics.warningFlags
  };
}

export async function getIndexedDbAreas(program?: string | null, period?: string | null) {
  const records = await getAll<LocalRecord>(RECORD_STORE);
  const scoped = records.filter((record) => (!program || record.program === program) && matchesPeriod(record, period));
  return aggregateAreaReadiness(normalizeRecords(scoped)).sort((left, right) => left.readinessScore - right.readinessScore);
}

export async function getIndexedDbTrend(program?: string | null) {
  const snapshots = await getAll<LocalSnapshot>(SNAPSHOT_STORE);
  const filtered = snapshots
    .filter((snapshot) => snapshot.areaId === null && (program ? snapshot.program === program : snapshot.program === null))
    .map((snapshot) => ({
      snapshotDate: new Date(snapshot.snapshotDate),
      periodLabel: snapshot.periodLabel ?? undefined,
      periodOrder: snapshot.periodOrder ?? undefined,
      readinessScore: snapshot.readinessScore,
      riskLevel: snapshot.riskLevel
    }));

  return buildTrendSeries(filtered);
}

export async function getIndexedDbForecast(program?: string | null) {
  const snapshots = await getAll<LocalSnapshot>(SNAPSHOT_STORE);
  const filtered = snapshots
    .filter((snapshot) => snapshot.areaId === null && (program ? snapshot.program === program : snapshot.program === null))
    .map((snapshot) => ({
      snapshotDate: new Date(snapshot.snapshotDate),
      periodLabel: snapshot.periodLabel ?? undefined,
      periodOrder: snapshot.periodOrder ?? undefined,
      acadYear: snapshot.acadYear ?? undefined,
      semester: snapshot.semester ?? undefined,
      readinessScore: snapshot.readinessScore
    }));

  return predictNextPeriods(filtered);
}
