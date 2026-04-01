export type RawDatasetRow = Record<string, string | number | boolean | null | undefined>;

export interface RequirementRecordInput {
  apId: string;
  program: string;
  acadYear: string;
  semester: string;
  areaId: string;
  areaCode: string;
  areaDescription: string;
  instrumentId: string;
  requirementDescription: string;
  assignedAt: Date | null;
  assignedModifiedAt: Date | null;
  assignedStatus: string | null;
  approvedOrder: number | null;
  latestUfId: string | null;
  latestFileUploadedAt: Date | null;
  latestFileVersion: string | null;
  latestFileStatus: string | null;
  latestFilename: string | null;
  latestFileExtension: string | null;
  hasFile: boolean;
  totalFilesUploaded: number;
  totalStatusLogs: number;
  reviseCount: number;
  replyCount: number;
  totalComments: number;
  nonEmptyComments: number;
  daysSinceAssignment: number | null;
  daysSinceLatestUpload: number | null;
  isPendingFlag: boolean;
  deadlineDate: Date | null;
  submissionDate: Date | null;
  daysToDeadline: number | null;
  daysOverdue: number | null;
}

export interface ParsedImportResult {
  validRows: RequirementRecordInput[];
  errors: string[];
  rowCount: number;
}
