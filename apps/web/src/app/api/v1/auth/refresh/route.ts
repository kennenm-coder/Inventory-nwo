import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { generateTokens } from "@/lib/auth";
import { handleApiError, apiError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) return apiError(400, "Refresh token required");

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return apiError(401, "User not found");

    const tokens = generateTokens(user.id);
    return NextResponse.json(tokens);
  } catch (err) {
    return handleApiError(err);
  }
}
