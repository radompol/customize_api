import { apiError, apiSuccess } from "@/lib/api";
import { importDataset } from "@/lib/importService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("File upload is required.");
    }

    const result = await importDataset(file.name, file.type, await file.arrayBuffer());

    return apiSuccess({
      batchId: result.batchId,
      rowsImported: result.rowsImported,
      snapshotsCreated: result.snapshotsCreated,
      errors: result.errors
    });
  } catch (error) {
    return apiError("Failed to import dataset.", 500, error instanceof Error ? error.message : error);
  }
}
