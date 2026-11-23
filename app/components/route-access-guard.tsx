"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type AuthUser } from "@/app/lib/auth-context";
import {
  arn,
  can,
  hasAnyAdminAccess,
  type GlobalRoleDefinition,
} from "@/app/lib/iam";

function getRedirectTarget(
  user: AuthUser | null,
  pathname: string,
  roles: Record<string, GlobalRoleDefinition>
): string | null {
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";
  const isLandingRoute = pathname === "/";

  // 1. Suspended users are forced onto /suspended from any other route
  if (user?.suspended) {
    return pathname === "/suspended" ? null : "/suspended";
  }

  // 2. Unauthenticated users cannot access /app or /admin
  if (!user) {
    if (isAdminRoute || isAppRoute) {
      return "/login";
    }
    return null;
  }

  // 3. IAM capability checks for /admin and sub-areas
  if (isAdminRoute) {
    if (!hasAnyAdminAccess(user, roles)) {
      return "/app";
    }
    if (
      pathname.startsWith("/admin/users") &&
      !can(user, "user:manage", arn.user("*"), roles) &&
      !can(user, "admin:access", arn.admin("users"), roles)
    ) {
      return "/admin";
    }
    if (
      pathname.startsWith("/admin/courses") &&
      !can(user, "course:review:list", arn.course("*"), roles) &&
      !can(user, "admin:access", arn.admin("review-queue"), roles)
    ) {
      return "/admin";
    }
    if (
      pathname.startsWith("/admin/roles") &&
      !can(user, "iam:roles:read", arn.iam("*"), roles) &&
      !can(user, "admin:access", arn.admin("iam"), roles)
    ) {
      return "/admin";
    }
  }

  // 4. App access check
  if (isAppRoute && !can(user, "app:access", arn.app(), roles)) {
    return "/login";
  }

  // 5. Authenticated users default to /app instead of Landing or Auth pages
  if (isLandingRoute || isAuthRoute) {
    return "/app";
  }

  return null;
}

/**
 * Enforces route-level auth, suspension, IAM capability checks, and authed-home redirects.
 */
export function RouteAccessGuard({ children }: { children: ReactNode }) {
  const { user, roles, isHydrated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const redirectTo = isHydrated ? getRedirectTarget(user, pathname, roles) : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (redirectTo) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
