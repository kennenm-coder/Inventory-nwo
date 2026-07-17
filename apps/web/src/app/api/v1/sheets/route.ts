import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { parseBody, handleApiError } from "@/lib/api-utils";
import { createSheetSchema } from "@scanvault/shared";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser(req));

    const sheets = await prisma.sheet.findMany({
      where: { organizationId: user.organizationId, isArchived: false },
      include: {
        _count: { select: { rows: true, fields: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(sheets);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const body = parseBody(createSheetSchema, await req.json());

    const sheet = await prisma.sheet.create({
      data: {
        ...body,
        organizationId: user.organizationId,
        createdById: user.id,
      },
    });

    return NextResponse.json(sheet, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
