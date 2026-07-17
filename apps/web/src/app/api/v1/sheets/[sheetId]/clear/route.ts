import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, apiError } from "@/lib/api-utils";

type Params = { params: Promise<{ sheetId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
    });
    if (!sheet) return apiError(404, "Sheet not found");

    await prisma.row.deleteMany({ where: { sheetId } });

    await prisma.auditLog.create({
      data: { sheetId, userId: user.id, action: "sheet_cleared" },
    });

    return NextResponse.json({ message: "All rows deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
