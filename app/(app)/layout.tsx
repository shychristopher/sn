import { SiteNavbar } from "@/app/components/site-navbar";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-1 flex-col">
      <SiteNavbar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
