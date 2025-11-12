import { auth } from "@/auth";

/**
 * Check if the current user is an admin
 * Admin email is configured via ADMIN_EMAIL environment variable
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    return false;
  }
  
  return session?.user?.email === adminEmail;
}

/**
 * Get the current user's email if they are an admin, otherwise throw
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    throw new Error("Admin email not configured");
  }
  
  if (!session?.user?.email || session.user.email !== adminEmail) {
    throw new Error("Unauthorized");
  }
  
  return session.user.email;
}

