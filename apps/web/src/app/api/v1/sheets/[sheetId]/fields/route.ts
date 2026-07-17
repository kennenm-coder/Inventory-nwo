import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { parseBody, handleApiError, apiError } from "@/lib/api-utils";
import { createFieldSchema } from "@scanvault/shared";

type Params = { params: Promise<{ sheetId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
    });
    if (!sheet) return apiError(404, "Sheet not found");

    const fields = await prisma.field.findMany({
      where: { sheetId },
      orderBy: { position: "asc" },
    });

    return NextResponse.json(fields);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
    });
    if (!sheet) return apiError(404, "Sheet not found");

    const body = parseBody(createFieldSchema, await req.json());

    const maxPos = await prisma.field.aggregate({
      where: { sheetId },
      _max: { position: true },
    });

    const field = await prisma.field.create({
      data: {
        sheetId,
        key: body.key,
        title: body.title,
        type: body.type,
        position: body.position ?? (maxPos._max.position ?? -1) + 1,
        settings: (body.settings ?? {}) as Prisma.InputJsonValue,
      },
    });

    await prisma.auditLog.create({
      data: { sheetId, userId: user.id, action: "field_added", changes: { field_key: body.key, title: body.title, type: body.type } },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
