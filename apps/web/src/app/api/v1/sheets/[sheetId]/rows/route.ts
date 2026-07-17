import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { parseBody, handleApiError, apiError } from "@/lib/api-utils";
import { createRowSchema, batchCreateRowsSchema, batchUpdateRowsSchema, batchDeleteRowsSchema } from "@scanvault/shared";

type Params = { params: Promise<{ sheetId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
    });
    if (!sheet) return apiError(404, "Sheet not found");

    const searchParams = req.nextUrl.searchParams;
    const withTitles = searchParams.get("withTitles") === "true";
    const barcode = searchParams.get("barcode");

    const where: Record<string, unknown> = { sheetId };
    if (barcode) where.barcode = barcode;

    const rows = await prisma.row.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        lastModifiedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (withTitles) {
      const fields = await prisma.field.findMany({
        where: { sheetId },
        orderBy: { position: "asc" },
      });
      return NextResponse.json({ rows, fields });
    }

    return NextResponse.json(rows);
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

    const json = await req.json();

    // Batch create
    if (json.rows && Array.isArray(json.rows)) {
      const body = parseBody(batchCreateRowsSchema, json);
      const created = await prisma.row.createMany({
        data: body.rows.map((r) => ({
          sheetId,
          barcode: r.barcode,
          data: r.data as Prisma.InputJsonValue,
          createdById: user.id,
          lastModifiedById: user.id,
        })),
      });
      return NextResponse.json({ count: created.count }, { status: 201 });
    }

    // Single create
    const body = parseBody(createRowSchema, json);
    const row = await prisma.row.create({
      data: {
        sheetId,
        barcode: body.barcode,
        data: body.data as Prisma.InputJsonValue,
        createdById: user.id,
        lastModifiedById: user.id,
      },
    });

    await prisma.auditLog.create({
      data: { sheetId, rowId: row.id, userId: user.id, action: "row_created", changes: body.data as Prisma.InputJsonValue },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(await getAuthUser(req));
    const { sheetId } = await params;

    const sheet = await prisma.sheet.findFirst({
      where: { id: sheetId, organizationId: user.organizationId },
    });
    if (!sheet) return apiError(404, "Sheet not found");

    const body = parseBody(batchUpdateRowsSchema, await req.json());

    const results = await Promise.all(
      body.rows.map(async (r) => {
        const existing = await prisma.row.findFirst({ where: { id: r.id, sheetId } });
        if (!existing) return null;

        const updated = await prisma.row.update({
          where: { id: r.id },
          data: {
            barcode: r.barcode,
            data: r.data as Prisma.InputJsonValue,
            lastModifiedById: user.id,
          },
        });

        await prisma.auditLog.create({
          data: {
            sheetId, rowId: r.id, userId: user.id, action: "row_updated",
            changes: { old: existing.data, new: r.data } as Prisma.InputJsonValue,
          },
        });

        return updated;
      }),
    );

    return NextResponse.json({ updated: results.filter(Boolean).length });
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

    const body = parseBody(batchDeleteRowsSchema, await req.json());

    const deleted = await prisma.row.deleteMany({
      where: { id: { in: body.ids }, sheetId },
    });

    return NextResponse.json({ deleted: deleted.count });
  } catch (err) {
    return handleApiError(err);
  }
}
