# API Contract

## `POST /api/import`
Uploads `.csv` or `.xlsx`, validates required columns, persists `import_batches` and `requirement_records`, then creates `readiness_snapshots`.

## `POST /api/r2/upload-url`
Creates a presigned `PUT` URL for direct browser-to-R2 uploads. Accepts `fileName`, `contentType`, optional `folder`, optional `key`, and optional `expiresInSeconds`.

## `POST /api/r2/upload`
Accepts multipart `file` uploads on the server, then stores the file in Cloudflare R2. Supports optional `folder` or explicit `key`.

## `DELETE /api/r2/object`
Deletes an R2 object by `key`.

## `PUT /api/r2/object`
Renames an R2 object by copying it to `newKey` and deleting the original `key`.

## `GET /api/readiness/summary`
Institution-wide readiness summary for summary cards and dashboard widgets.

## `GET /api/readiness/program/[program]`
Program summary plus area breakdown rows.

## `GET /api/readiness/areas?program=...`
Area-level readiness rows, sorted by lowest readiness first.

## `GET /api/readiness/trend?program=...`
Historical readiness series and chart-ready labels/series arrays.

## `GET /api/readiness/forecast?program=...`
Forecast points, trend direction, confidence note, and chart-ready series arrays.

## Widget Aliases
- `/api/readiness/widgets/summary`
- `/api/readiness/widgets/areas`
- `/api/readiness/widgets/trend`
- `/api/readiness/widgets/forecast`
