import { z } from "zod";
import { OPTIONAL_COLUMNS, REQUIRED_COLUMNS } from "@/lib/constants";
import { parseDateSafely } from "@/lib/dateUtils";
import type { RawDatasetRow, RequirementRecordInput } from "@/models/dataset.types";

const rowSchema = z.object({
  ap_id: z.any(),
  program: z.any(),
  acadYear: z.any(),
  semester: z.any(),
  area_id: z.any(),
  area_code: z.any(),
  area_description: z.any(),
  instrument_id: z.any(),
  requirement_description: z.any()
});

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
}

export function normalizeHeaders(row: RawDatasetRow): RawDatasetRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim(), typeof value === "string" ? value.trim() : value])
  );
}

export function validateRequiredColumns(headers: string[]) {
  const normalized = headers.map((header) => header.trim());
  const missing = REQUIRED_COLUMNS.filter((column) => !normalized.includes(column));
  return {
    ok: missing.length === 0,
    missing,
    supportedOptional: OPTIONAL_COLUMNS
  };
}

export function mapRawRowToRequirementRecord(rawRow: RawDatasetRow): RequirementRecordInput {
  const row = normalizeHeaders(rawRow);
  rowSchema.parse(row);

  return {
    apId: String(row.ap_id).trim(),
    program: String(row.program).trim(),
    acadYear: String(row.acadYear).trim(),
    semester: String(row.semester).trim(),
    areaId: String(row.area_id).trim(),
    areaCode: String(row.area_code).trim(),
    areaDescription: String(row.area_description).trim(),
    instrumentId: String(row.instrument_id).trim(),
    requirementDescription: String(row.requirement_description).trim(),
    assignedAt: parseDateSafely(row.assigned_at),
    assignedModifiedAt: parseDateSafely(row.assigned_modified_at),
    assignedStatus: asNullableString(row.assigned_status),
    approvedOrder: asNumber(row.approvedOrder),
    latestUfId: asNullableString(row.latest_uf_id),
    latestFileUploadedAt: parseDateSafely(row.latest_file_uploaded_at),
    latestFileVersion: asNullableString(row.latest_file_version),
    latestFileStatus: asNullableString(row.latest_file_status),
    latestFilename: asNullableString(row.latest_filename),
    latestFileExtension: asNullableString(row.latest_file_extension),
    hasFile: asBoolean(row.has_file),
    totalFilesUploaded: asNumber(row.total_files_uploaded) ?? 0,
    totalStatusLogs: asNumber(row.total_status_logs) ?? 0,
    reviseCount: asNumber(row.revise_count) ?? 0,
    replyCount: asNumber(row.reply_count) ?? 0,
    totalComments: asNumber(row.total_comments) ?? 0,
    nonEmptyComments: asNumber(row.non_empty_comments) ?? 0,
    daysSinceAssignment: asNumber(row.days_since_assignment),
    daysSinceLatestUpload: asNumber(row.days_since_latest_upload),
    isPendingFlag: asBoolean(row.is_pending_flag),
    deadlineDate: parseDateSafely(row.deadline_date),
    submissionDate: parseDateSafely(row.submission_date),
    daysToDeadline: asNumber(row.days_to_deadline),
    daysOverdue: asNumber(row.days_overdue)
  };
}
