import Papa from "papaparse";
import { mapRawRowToRequirementRecord, normalizeHeaders, validateRequiredColumns } from "@/lib/validators";
import type { ParsedImportResult, RawDatasetRow } from "@/models/dataset.types";

export function parseCsvFile(contents: string): ParsedImportResult {
  const parsed = Papa.parse<RawDatasetRow>(contents, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  const validation = validateRequiredColumns(headers);

  if (!validation.ok) {
    return {
      validRows: [],
      errors: [`Missing required columns: ${validation.missing.join(", ")}`],
      rowCount: 0
    };
  }

  const validRows = [];
  const errors: string[] = [];

  parsed.data.forEach((row, index) => {
    try {
      validRows.push(mapRawRowToRequirementRecord(normalizeHeaders(row)));
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : "Malformed row"}`);
    }
  });

  return { validRows, errors, rowCount: parsed.data.length };
}
