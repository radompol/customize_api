import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api";
import { deleteFromR2, renameR2Object } from "@/lib/r2";

export const runtime = "nodejs";

const deleteObjectSchema = z.object({
  key: z.string().trim().min(1, "key is required.")
});

const renameObjectSchema = z.object({
  key: z.string().trim().min(1, "key is required."),
  newKey: z.string().trim().min(1, "newKey is required.")
});

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = deleteObjectSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid delete request.", 400, parsed.error.flatten());
    }

    const result = await deleteFromR2(parsed.data.key);

    return apiSuccess({
      data: {
        ...result,
        deleted: true
      }
    });
  } catch (error) {
    return apiError("Failed to delete R2 object.", 500, error instanceof Error ? error.message : error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = renameObjectSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid update request.", 400, parsed.error.flatten());
    }

    if (parsed.data.key === parsed.data.newKey) {
      return apiError("newKey must be different from key.");
    }

    const result = await renameR2Object(parsed.data.key, parsed.data.newKey);

    return apiSuccess({
      data: result
    });
  } catch (error) {
    return apiError("Failed to update R2 object.", 500, error instanceof Error ? error.message : error);
  }
}
