import { redirect } from "next/navigation";
import SessionProvider from "@/components/session-provider";
import { isAdmin } from "@/utils/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  return <SessionProvider>{children}</SessionProvider>;
}

