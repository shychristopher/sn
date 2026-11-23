import { SiteNavbar } from "@/app/components/site-navbar";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-1 flex-col">
      <SiteNavbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        {children}
      </main>

      <footer className="border-t border-border px-6 py-6 text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl">
          Shy Notes — Landing layout footer (isolated from App and Admin)
        </div>
      </footer>
    </div>
  );
}
