import SessionProvider from "@/components/session-provider";

export default function RoadmapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}

