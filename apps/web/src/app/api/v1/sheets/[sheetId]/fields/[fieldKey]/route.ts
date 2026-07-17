import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { parseBody, handleApiError, apiError } from "@/lib/api-utils";
import { updateFieldSchema } from "@scanvault/shared";

type Params = { params: Promise<{ sheetId: string; fieldKey: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId, fieldKey } = await params;

    const field = await prisma.field.findFirst({
      where: { sheetId, key: fieldKey },
      include: { sheet: { select: { organizationId: true } } },
    });
    if (!field || field.sheet.organizationId !== user.organizationId) {
      return apiError(404, "Field not found");
    }

    const body = parseBody(updateFieldSchema, await req.json());

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.settings !== undefined) updateData.settings = body.settings;

    const updated = await prisma.field.update({
      where: { id: field.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: { sheetId, userId: user.id, action: "field_updated", changes: { field_key: fieldKey, ...updateData } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId, fieldKey } = await params;

    const field = await prisma.field.findFirst({
      where: { sheetId, key: fieldKey },
      include: { sheet: { select: { organizationId: true } } },
    });
    if (!field || field.sheet.organizationId !== user.organizationId) {
      return apiError(404, "Field not found");
    }

    await prisma.field.delete({ where: { id: field.id } });

    await prisma.auditLog.create({
      data: { sheetId, userId: user.id, action: "field_deleted", changes: { field_key: fieldKey } },
    });

    return NextResponse.json({ message: "Field deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
