"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  KeyRound,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { arn } from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminOverviewPage() {
  const { user, users, roles, can } = useAuth();
  const { courses } = useCourses();

  const canReviewCourses =
    can("course:review:list", arn.course("*")) ||
    can("admin:access", arn.admin("review-queue"));
  const canManageUsers =
    can("user:manage", arn.user("*")) ||
    can("admin:access", arn.admin("users"));
  const canViewRoles =
    can("iam:roles:read", arn.iam("*")) ||
    can("admin:access", arn.admin("iam"));

  const activeUsersCount = users.filter((u) => !u.suspended).length;
  const suspendedCount = users.filter((u) => u.suspended).length;
  const roleCount = Object.keys(roles).length;
  const pendingCourses = courses.filter(
    (c) => c.publishStatus === "pending-review"
  ).length;
  const totalScopedGrants = users.reduce(
    (acc, u) => acc + u.scopedRoles.length,
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Admin Dashboard
            </h1>
            {user && <Badge variant="secondary">{user.roleSummary}</Badge>}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage directory users, IAM roles, scoped course ARNs, and course
            publication reviews. Any changes persist in{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              localStorage
            </code>{" "}
            and update live when you switch users in the top bar.
          </p>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Directory Users</span>
              <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {users.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {activeUsersCount} active · {suspendedCount} suspended
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Global IAM Roles</span>
              <KeyRound
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {roleCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {totalScopedGrants} resource-scoped course{" "}
            {totalScopedGrants === 1 ? "grant" : "grants"}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Pending Reviews</span>
              <BookOpenCheck
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {pendingCourses}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Out of {courses.length} courses in catalog
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Suspended Accounts</span>
              <ShieldAlert
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {suspendedCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Enforced via explicit <code className="font-mono">Deny *</code>
          </CardContent>
        </Card>
      </div>

      {/* Permitted Admin Workspaces */}
      <section aria-labelledby="admin-modules-heading" className="space-y-3">
        <h2
          id="admin-modules-heading"
          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Your Permitted Modules
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {canManageUsers && (
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="size-4 text-primary" aria-hidden="true" />
                    <span>Users &amp; Role Assignments</span>
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {users.length}
                  </Badge>
                </div>
                <CardDescription>
                  Create users, attach or revoke global roles, grant scoped
                  course ownership by ID, or suspend accounts—then preview live.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/admin/users" />}
                >
                  <span>Manage Users</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )}

          {canViewRoles && (
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <KeyRound
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                    <span>Roles &amp; Privileges</span>
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {roleCount}
                  </Badge>
                </div>
                <CardDescription>
                  Define custom IAM roles, attach Allow/Deny ARN statements, and
                  test access live in the Policy Simulator.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/admin/roles" />}
                >
                  <span>Edit Roles &amp; Policies</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )}

          {canReviewCourses && (
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpenCheck
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                    <span>Course Review Queue</span>
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {pendingCourses} pending
                  </Badge>
                </div>
                <CardDescription>
                  Approve or deny publication submissions and manage protected
                  curated tags like <code className="font-mono">Recommended</code>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/admin/courses" />}
                >
                  <span>Open Review Queue</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Active Principal Card */}
      {user && (
        <Card size="sm">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="size-4 text-primary" aria-hidden="true" />
                <span>Signed in as {user.name}</span>
              </CardTitle>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {user.id}
              </code>
            </div>
            <CardDescription className="text-xs">{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">Global roles:</span>
              {user.globalRoles.length > 0 ? (
                user.globalRoles.map((roleId) => (
                  <Badge key={roleId} variant="secondary" className="font-mono">
                    {roleId}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
            {user.scopedRoles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">Scoped grants:</span>
                {user.scopedRoles.map((grant) => (
                  <Badge
                    key={`${grant.roleId}-${grant.resourceId}`}
                    variant="outline"
                    className="font-mono"
                  >
                    {grant.roleId} @ {grant.resourceId}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
