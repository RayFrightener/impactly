import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Gets the current user, sets app.current_user_id for RLS, and returns the user.
 * Returns a NextResponse 401 if not authenticated.
 */
export async function withUserAndRLS() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Set the RLS session variable for this connection
  // Validate user.id is a valid CUID format (alphanumeric, 25 chars)
  // This prevents SQL injection since user.id comes from Prisma
  if (!/^[a-z0-9]{25}$/i.test(user.id)) {
    throw new Error("Invalid user ID format");
  }
  await prisma.$executeRawUnsafe(
    `SET app.current_user_id = '${user.id.replace(/'/g, "''")}'`
  );

  return user;
}