"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  Shield,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { arn } from "@/app/lib/iam";
import { useAccessibility } from "@/app/lib/accessibility-context";
import { AccessibilityTrigger } from "@/app/components/accessibility-trigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof BookOpen;
  matchPrefix: string;
}

export function SiteNavbar() {
  const { user, signOut, can, hasAdminAccess } = useAuth();
  const { openModal: openA11yModal } = useAccessibility();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = Boolean(user);
  const isSuspended = Boolean(user?.suspended);
  const canAccessApp = can("app:access", arn.app());

  // Build IAM-gated links ONLY for authenticated, non-suspended users
  const navItems: NavItem[] = [];
  if (user && !user.suspended) {
    if (canAccessApp) {
      navItems.push({
        href: "/app",
        label: "My Courses",
        icon: BookOpen,
        matchPrefix: "/app",
      });
    }
    if (hasAdminAccess) {
      navItems.push({
        href: "/admin",
        label: "Admin",
        icon: Shield,
        matchPrefix: "/admin",
      });
    }
  }

  const brandHref = !user ? "/" : isSuspended ? "/suspended" : "/app";

  const isActiveLink = (item: NavItem) =>
    pathname === item.matchPrefix ||
    pathname.startsWith(`${item.matchPrefix}/`);

  const handleSignOut = () => {
    setMobileOpen(false);
    signOut();
    router.push("/");
  };

  const isFullWidthWorkspace =
    pathname.startsWith("/app/courses/") || pathname.startsWith("/admin");

  return (
    <header className="no-print sticky top-(--dev-bar-height) z-40 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6",
          isFullWidthWorkspace ? "max-w-none" : "max-w-6xl"
        )}
      >
        {/* Left: Brand + Desktop Permission-Based Navigation */}
        <div className="flex items-center gap-6">
          <Link
            href={brandHref}
            className="group inline-flex items-center gap-2.5 rounded-lg py-1 pr-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs transition-transform group-hover:scale-[1.03]"
            >
              <NotebookPen className="size-4" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              Shy Notes
            </span>
          </Link>

          {/* Desktop nav links — hidden when unauthenticated or suspended */}
          {navItems.length > 0 && (
            <nav
              aria-label="Primary"
              className="hidden items-center gap-1 md:flex"
            >
              {navItems.map((item) => {
                const active = isActiveLink(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active
                        ? "bg-accent font-medium text-accent-foreground ring-1 ring-border"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right: Site-wide Accessibility button + Login Action OR User Chip */}
        <div className="flex items-center gap-2">
          <AccessibilityTrigger />

          {!isAuthenticated && (
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              <LogIn className="size-4" aria-hidden="true" />
              <span>Sign in</span>
            </Button>
          )}

          {user && isSuspended && (
            <Badge variant="destructive" className="hidden gap-1 sm:inline-flex">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Suspended
            </Badge>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Account menu for ${user.name}`}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background py-1 pl-1.5 pr-2.5 text-sm font-medium text-foreground shadow-2xs transition-colors outline-none hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                }
              >
                <Avatar size="sm" className="size-7">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{user.initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-36 truncate sm:inline-block">
                  {user.name}
                </span>
                <ChevronDown
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={8} className="w-60">
                <div className="flex items-center gap-2.5 px-2 py-2">
                  <Avatar size="default">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <Badge
                    variant={isSuspended ? "destructive" : "secondary"}
                    className="shrink-0"
                  >
                    {isSuspended ? "Suspended" : user.roleSummary}
                  </Badge>
                </div>

                <DropdownMenuSeparator />

                {!isSuspended ? (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Account</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <User aria-hidden="true" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings aria-hidden="true" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={openA11yModal}>
                        <SlidersHorizontal aria-hidden="true" />
                        <span>Accessibility settings</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                      {canAccessApp && (
                        <DropdownMenuItem onClick={() => router.push("/app")}>
                          <BookOpen aria-hidden="true" />
                          <span>My Courses</span>
                        </DropdownMenuItem>
                      )}
                      {hasAdminAccess && (
                        <DropdownMenuItem
                          onClick={() => router.push("/admin")}
                        >
                          <Shield aria-hidden="true" />
                          <span>Admin Console</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </>
                ) : (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Account Status</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => router.push("/suspended")}
                    >
                      <AlertTriangle aria-hidden="true" />
                      <span>Suspension &amp; appeal details</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleSignOut}
                >
                  <LogOut aria-hidden="true" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile Menu Drawer — only shown when authenticated with nav links */}
          {navItems.length > 0 && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open navigation menu"
                  />
                }
              >
                <Menu className="size-4" aria-hidden="true" />
              </SheetTrigger>

              <SheetContent side="right" className="w-72">
                <SheetHeader className="border-b border-border pb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
                    >
                      <NotebookPen className="size-3.5" />
                    </span>
                    <span>Shy Notes</span>
                  </SheetTitle>
                  <SheetDescription>
                    Signed in as {user?.name} ({user?.roleSummary})
                  </SheetDescription>
                </SheetHeader>

                <nav
                  aria-label="Mobile navigation"
                  className="flex flex-col gap-1 px-4"
                >
                  {navItems.map((item) => {
                    const active = isActiveLink(item);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                          active
                            ? "bg-accent font-medium text-accent-foreground ring-1 ring-border"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <Separator className="my-2" />

                <div className="flex flex-col gap-1 px-4">
                  <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                    Account
                  </p>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-left text-sm text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  >
                    <User className="size-4" aria-hidden="true" />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-left text-sm text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  >
                    <Settings className="size-4" aria-hidden="true" />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="mt-auto border-t border-border p-4">
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={handleSignOut}
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
