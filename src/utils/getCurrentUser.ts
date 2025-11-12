import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the current authenticated user from the database, or null if not authenticated.
 * You can extend the select fields as needed.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true }, // Add more fields if needed
  });
}