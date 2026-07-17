import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function parseBody<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return apiError(401, "Authorization required");
  }

  console.error("API error:", err);
  return apiError(500, "Internal server error");
}
