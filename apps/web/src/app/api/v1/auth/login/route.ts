import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateTokens } from "@/lib/auth";
import { parseBody, handleApiError, apiError } from "@/lib/api-utils";
import { loginSchema } from "@scanvault/shared";

export async function POST(req: NextRequest) {
  try {
    const body = parseBody(loginSchema, await req.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return apiError(401, "Invalid email or password");
    }

    const tokens = generateTokens(user.id);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      organization: user.organization,
      ...tokens,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
