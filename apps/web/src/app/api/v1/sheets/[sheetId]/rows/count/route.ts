import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { handleApiError, apiError } from "@/lib/api-utils";

type Params = { params: Promise<{ sheetId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
    });
    if (!sheet) return apiError(404, "Sheet not found");

    const count = await prisma.row.count({ where: { sheetId } });
    return NextResponse.json({ count });
  } catch (err) {
    return handleApiError(err);
  }
}
