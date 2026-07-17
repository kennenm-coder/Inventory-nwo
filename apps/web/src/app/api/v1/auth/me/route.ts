import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return apiError(401, "Authorization required");

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, name: true, slug: true, plan: true },
    });

    return NextResponse.json({ user, organization: org });
  } catch (err) {
    return handleApiError(err);
  }
}
