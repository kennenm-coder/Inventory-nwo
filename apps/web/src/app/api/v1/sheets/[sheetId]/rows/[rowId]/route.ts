import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { parseBody, handleApiError, apiError } from "@/lib/api-utils";
import { updateRowSchema } from "@scanvault/shared";

type Params = { params: Promise<{ sheetId: string; rowId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId, rowId } = await params;

    const row = await prisma.row.findFirst({
      where: { id: rowId, sheetId },
      include: {
        sheet: { select: { organizationId: true } },
        createdBy: { select: { id: true, name: true } },
        lastModifiedBy: { select: { id: true, name: true } },
      },
    });

    if (!row || row.sheet.organizationId !== user.organizationId) {
      return apiError(404, "Row not found");
    }

    return NextResponse.json(row);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId, rowId } = await params;

    const existing = await prisma.row.findFirst({
      where: { id: rowId, sheetId },
      include: { sheet: { select: { organizationId: true } } },
    });
    if (!existing || existing.sheet.organizationId !== user.organizationId) {
      return apiError(404, "Row not found");
    }

    const body = parseBody(updateRowSchema, await req.json());
    const partial = req.nextUrl.searchParams.get("partial") === "true";

    const newData = partial
      ? { ...(existing.data as object), ...body.data }
      : body.data;

    const updated = await prisma.row.update({
      where: { id: rowId },
      data: {
        barcode: body.barcode ?? existing.barcode,
        data: newData as Prisma.InputJsonValue,
        lastModifiedById: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        sheetId, rowId, userId: user.id, action: "row_updated",
        changes: { old: existing.data, new: newData } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId, rowId } = await params;

    const row = await prisma.row.findFirst({
      where: { id: rowId, sheetId },
      include: { sheet: { select: { organizationId: true } } },
    });
    if (!row || row.sheet.organizationId !== user.organizationId) {
      return apiError(404, "Row not found");
    }

    await prisma.row.delete({ where: { id: rowId } });

    await prisma.auditLog.create({
      data: { sheetId, rowId, userId: user.id, action: "row_deleted", changes: row.data as Prisma.InputJsonValue },
    });

    return NextResponse.json({ message: "Row deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
