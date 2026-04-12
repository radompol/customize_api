import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api";
import { buildR2ObjectKey, createSignedR2Upload } from "@/lib/r2";

export const runtime = "nodejs";

const uploadUrlSchema = z.object({
  fileName: z.string().min(1, "fileName is required."),
  contentType: z.string().min(1, "contentType is required."),
  folder: z.string().trim().min(1).optional(),
  key: z.string().trim().min(1).optional(),
  expiresInSeconds: z.number().int().min(30).max(3600).optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = uploadUrlSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid upload request.", 400, parsed.error.flatten());
    }

    const { fileName, contentType, folder, key, expiresInSeconds } = parsed.data;
    const objectKey = key ?? buildR2ObjectKey(fileName, folder);
    const signedUpload = await createSignedR2Upload({
      key: objectKey,
      contentType,
      expiresInSeconds
    });

    return apiSuccess({
      data: {
        ...signedUpload,
        method: "PUT",
        headers: {
          "Content-Type": contentType
        }
      }
    });
  } catch (error) {
    return apiError("Failed to create R2 upload URL.", 500, error instanceof Error ? error.message : error);
  }
}
