import * as XLSX from "xlsx";
import { mapRawRowToRequirementRecord, normalizeHeaders, validateRequiredColumns } from "@/lib/validators";
import type { ParsedImportResult, RawDatasetRow, RequirementRecordInput } from "@/models/dataset.types";

export function parseXlsxFile(buffer: ArrayBuffer): ParsedImportResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawDatasetRow>(sheet, { defval: null });

  if (!rows.length) {
    return { validRows: [], errors: ["Spreadsheet contains no data rows."], rowCount: 0 };
  }

  const headers = Object.keys(normalizeHeaders(rows[0]));
  const validation = validateRequiredColumns(headers);

  if (!validation.ok) {
    return {
      validRows: [],
      errors: [`Missing required columns: ${validation.missing.join(", ")}`],
      rowCount: rows.length
    };
  }

  const validRows: RequirementRecordInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    try {
      validRows.push(mapRawRowToRequirementRecord(normalizeHeaders(row)));
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : "Malformed row"}`);
    }
  });

  return { validRows, errors, rowCount: rows.length };
}
