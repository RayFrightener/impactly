import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SessionProvider from "@/components/session-provider";

export default async function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="journal-isolated min-h-screen">
      <SessionProvider>{children}</SessionProvider>
    </div>
  );
}

