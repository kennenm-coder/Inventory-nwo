import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateTokens } from "@/lib/auth";
import { parseBody, handleApiError, apiError } from "@/lib/api-utils";
import { registerSchema } from "@scanvault/shared";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = parseBody(registerSchema, await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return apiError(409, "Email already registered");

    const passwordHash = await bcrypt.hash(body.password, 12);
    const orgName = body.organizationName || `${body.name}'s Organization`;
    let slug = slugify(orgName);

    const slugExists = await prisma.organization.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

    const org = await prisma.organization.create({
      data: { name: orgName, slug },
    });

    const user = await prisma.user.create({
      data: { email: body.email, name: body.name, passwordHash, organizationId: org.id, role: "owner" },
    });

    const tokens = generateTokens(user.id);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      organization: { id: org.id, name: org.name, slug: org.slug },
      ...tokens,
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
