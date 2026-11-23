"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  KeyRound,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { arn } from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import { SiteNavbar } from "@/app/components/site-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

export function AdminWorkspaceShell({ children }: { children: ReactNode }) {
  const { user, users, roles, can } = useAuth();
  const { courses } = useCourses();
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: AdminNavItem[] = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
  ];

  if (
    can("course:review:list", arn.course("*")) ||
    can("admin:access", arn.admin("review-queue"))
  ) {
    navItems.push({
      href: "/admin/courses",
      label: "Courses",
      icon: BookOpenCheck,
      badge: String(courses.length),
    });
  }

  if (
    can("user:manage", arn.user("*")) ||
    can("admin:access", arn.admin("users"))
  ) {
    navItems.push({
      href: "/admin/users",
      label: "Users",
      icon: Users,
      badge: String(users.length),
    });
  }

  if (
    can("iam:roles:read", arn.iam("*")) ||
    can("admin:access", arn.admin("iam"))
  ) {
    navItems.push({
      href: "/admin/roles",
      label: "Roles & Privileges",
      icon: KeyRound,
      badge: String(Object.keys(roles).length),
    });
  }

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);

  const renderSidebarLinks = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <Shield className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              Admin Console
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.roleSummary ?? "IAM"}
            </p>
          </div>
        </div>

        {isMobile ? (
          <SheetClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Close admin menu"
              />
            }
          >
            <X className="size-4" aria-hidden="true" />
          </SheetClose>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Collapse sidebar to icon rail"
            onClick={() => setCompact(true)}
          >
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Admin navigation"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Console
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex h-9 items-center justify-between gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "bg-background text-foreground shadow-2xs ring-1 ring-border"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge && (
                <Badge
                  variant={active ? "default" : "secondary"}
                  className="h-4 min-w-5 justify-center px-1.5 font-mono text-[10px]"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Shortcut */}
      <div className="border-t border-border p-3">
        <Link
          href="/app"
          onClick={() => setMobileOpen(false)}
          className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Back to Courses App</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteNavbar />

      {/* Mobile Admin Sub-Bar */}
      <div className="no-print sticky top-[calc(4rem+var(--dev-bar-height))] z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-md md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
              />
            }
          >
            <PanelLeft className="size-4" aria-hidden="true" />
            <span>Admin Menu</span>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-72 p-0">
            <SheetTitle className="sr-only">Admin Console Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Navigate between Overview, Course Review, Users, and Roles.
            </SheetDescription>
            {renderSidebarLinks(true)}
          </SheetContent>
        </Sheet>
        <Badge variant="secondary" className="text-[11px]">
          {user?.roleSummary ?? "Admin"}
        </Badge>
      </div>

      {/* Main Flex Shell (Matches Course Workspace Structure) */}
      <div className="flex min-h-0 flex-1">
        {/* Desktop Smart Sidebar (Expanded / Compact Icon Rail) */}
        <aside
          aria-label="Admin sidebar"
          className={cn(
            "no-print sticky top-[calc(4rem+var(--dev-bar-height))] hidden h-[calc(100dvh-4rem-var(--dev-bar-height))] shrink-0 flex-col border-r border-border bg-surface/60 transition-[width] duration-200 md:flex",
            compact ? "w-16" : "w-64"
          )}
        >
          {!compact ? (
            renderSidebarLinks(false)
          ) : (
            <div className="flex h-full flex-col items-center py-3">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Expand admin sidebar"
                      onClick={() => setCompact(false)}
                    />
                  }
                >
                  <PanelLeftOpen className="size-4" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>

              <nav
                aria-label="Admin icon navigation"
                className="mt-4 flex flex-1 flex-col items-center gap-1.5"
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger
                        render={
                          <Link
                            href={item.href}
                            aria-label={item.label}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex size-9 items-center justify-center rounded-lg transition-colors",
                              active
                                ? "bg-background text-foreground shadow-2xs ring-1 ring-border"
                                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                            )}
                          />
                        }
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                        {item.badge ? ` (${item.badge})` : ""}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href="/app"
                      aria-label="Back to Courses App"
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                    />
                  }
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent side="right">Back to Courses</TooltipContent>
              </Tooltip>
            </div>
          )}
        </aside>

        {/* Main Admin Content Area */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-20 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
