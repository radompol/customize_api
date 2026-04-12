import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api";
import { createCorsPreflightResponse } from "@/lib/cors";
import { buildR2ObjectKey, uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";

const uploadMetadataSchema = z.object({
  folder: z.string().trim().min(1).optional(),
  key: z.string().trim().min(1).optional()
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("File upload is required.", 400, undefined, request);
    }

    const parsed = uploadMetadataSchema.safeParse({
      folder: formData.get("folder") ?? undefined,
      key: formData.get("key") ?? undefined
    });

    if (!parsed.success) {
      return apiError("Invalid upload metadata.", 400, parsed.error.flatten(), request);
    }

    const objectKey = parsed.data.key ?? buildR2ObjectKey(file.name, parsed.data.folder);
    const upload = await uploadToR2({
      key: objectKey,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream"
    });

    return apiSuccess({
      data: {
        ...upload,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size
      }
    }, undefined, request);
  } catch (error) {
    return apiError("Failed to upload file to R2.", 500, error instanceof Error ? error.message : error, request);
  }
}

export function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, ["POST", "OPTIONS"]);
}
