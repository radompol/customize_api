export const REQUIRED_COLUMNS = [
  "ap_id",
  "program",
  "acadYear",
  "semester",
  "area_id",
  "area_code",
  "area_description",
  "instrument_id",
  "requirement_description",
  "assigned_at",
  "assigned_modified_at",
  "assigned_status",
  "approvedOrder",
  "latest_uf_id",
  "latest_file_uploaded_at",
  "latest_file_version",
  "latest_file_status",
  "latest_filename",
  "latest_file_extension",
  "has_file",
  "total_files_uploaded",
  "total_status_logs",
  "revise_count",
  "reply_count",
  "total_comments",
  "non_empty_comments",
  "days_since_assignment",
  "days_since_latest_upload",
  "is_pending_flag"
] as const;

export const OPTIONAL_COLUMNS = ["deadline_date", "submission_date", "days_to_deadline", "days_overdue"] as const;

export const STATUS_CONFIG = {
  approved: ["approved", "compliant", "completed", "accepted", "done"],
  pending: ["pending", "in review", "review", "for checking", "submitted"],
  revise: ["revise", "revision", "needs revision", "returned", "rejected"]
};

export const SCORE_WEIGHTS = {
  completion: 0.3,
  status: 0.25,
  quality: 0.2,
  aging: 0.15,
  timeline: 0.1
};

export const DEFAULT_LOOKBACK = 3;
export const DEFAULT_FORECAST_PERIODS = 3;
