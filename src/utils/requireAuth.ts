import { NextResponse } from "next/server";
import { getCurrentUser } from "./getCurrentUser";

/**
 * Returns the current user if authenticated, or a NextResponse 401 if not.
 * Use in API routes that require authentication.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}