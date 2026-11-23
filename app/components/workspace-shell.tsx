import Link from "next/link";
import type { ReactNode } from "react";
import { SiteNavbar } from "./site-navbar";
import { Badge } from "@/components/ui/badge";

export interface NavLinkItem {
  href: string;
  label: string;
}

interface WorkspaceShellProps {
  variant: "app" | "admin";
  title: string;
  links: NavLinkItem[];
  children: ReactNode;
}

/**
 * Shared workspace shell for App and Admin sections.
 * Small deviations between App and Admin are handled via `variant` and `links`.
 * All non-essential chrome carries `.no-print` so printable course views strip it cleanly.
 */
export function WorkspaceShell({
  variant,
  title,
  links,
  children,
}: WorkspaceShellProps) {
  const isAdmin = variant === "admin";

  return (
    <div className="min-h-full flex flex-1 flex-col">
      <SiteNavbar />

      <div className="workspace-layout mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        <aside
          aria-label={`${title} sidebar`}
          className="no-print w-full shrink-0 border-b border-border pb-4 md:w-52 md:border-b-0 md:border-r md:pb-0 md:pr-6"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAdmin ? "Admin" : "Workspace"}
            </p>
            {isAdmin && <Badge variant="secondary">Admin</Badge>}
          </div>
          <ul className="space-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <main className="workspace-main min-w-0 flex-1">{children}</main>
      </div>

      <footer className="no-print border-t border-border px-6 py-4 text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl">
          Shy Notes — Shared workspace footer ({variant})
        </div>
      </footer>
    </div>
  );
}
