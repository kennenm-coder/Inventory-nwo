import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { parseBody, handleApiError, apiError } from "@/lib/api-utils";
import { updateSheetSchema } from "@scanvault/shared";

type Params = { params: Promise<{ sheetId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
      include: {
        fields: { orderBy: { position: "asc" } },
        _count: { select: { rows: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!sheet) return apiError(404, "Sheet not found");
    return NextResponse.json(sheet);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;
    const body = parseBody(updateSheetSchema, await req.json());

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
    });
    if (!sheet) return apiError(404, "Sheet not found");

    const updated = await prisma.sheet.update({ where: { id: sheetId }, data: body });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
    });
    if (!sheet) return apiError(404, "Sheet not found");

    await prisma.sheet.delete({ where: { id: sheetId } });
    return NextResponse.json({ message: "Sheet deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
