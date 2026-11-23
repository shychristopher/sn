import { SiteNavbar } from "@/app/components/site-navbar";

export default function SuspendedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-1 flex-col">
      <SiteNavbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
