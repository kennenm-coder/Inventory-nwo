import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");
  if (!header) return null;

  const token = header.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, organizationId: true, role: true },
    });
    return user;
  } catch {
    return null;
  }
}

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}
