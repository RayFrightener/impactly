import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SessionProvider from "@/components/session-provider";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <SessionProvider>
      {children}
      <FeedbackWidget />
    </SessionProvider>
  );
}

