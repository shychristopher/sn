"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  FileText,
  KeyRound,
  Layers,
  Settings,
  Shield,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { SCOPED_ROLE_TEMPLATES, arn } from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import { flattenCoursePages, type CourseRecord } from "@/app/lib/courses-data";
import { CourseSettingsForm } from "@/app/components/course-settings-form";
import { CourseContentEditor } from "@/app/components/course-content-editor";
import { CourseMembersPanel } from "@/app/components/course-members-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProfileTab = "settings" | "content" | "members" | "iam";

export function AdminCourseProfile({ courseId }: { courseId: string }) {
  const { getCourseById, isHydrated } = useCourses();
  const course = getCourseById(courseId);

  if (!course) {
    if (!isHydrated) {
      return (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading course profile…
        </div>
      );
    }

    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-xl font-semibold">Course not found</h1>
        <p className="text-sm text-muted-foreground">
          No course with immutable ID{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {courseId}
          </code>{" "}
          exists in the catalog.
        </p>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/courses" />}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back to Courses</span>
        </Button>
      </div>
    );
  }

  return <AdminCourseProfileLoaded key={course.id} course={course} />;
}

function AdminCourseProfileLoaded({ course }: { course: CourseRecord }) {
  const { users, roles, can } = useAuth();
  const { getEnrolledUserIdsForCourse, updateCourse } = useCourses();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ProfileTab>("settings");

  const courseArn = arn.course(course.id);
  const canApprove = can("course:review:approve", courseArn);
  const canDeny = can("course:review:deny", courseArn);
  const canManageMembers =
    can("course:members:manage", courseArn) ||
    can("course:settings:manage", courseArn) ||
    can("user:manage", arn.user("*"));

  const memberCount = getEnrolledUserIdsForCourse(course.id).length;
  const totalPages = useMemo(
    () => flattenCoursePages(course.modules).length,
    [course.modules]
  );

  const scopedHolders = useMemo(
    () =>
      users
        .map((u) => {
          const grant = u.scopedRoles.find((g) => g.resourceId === course.id);
          return grant ? { user: u, grant } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [users, course.id]
  );

  const hasRecommended = course.curatedTagIds.includes(
    "tag_curated_recommended"
  );
  const hasStaffPick = course.curatedTagIds.includes("tag_curated_staff_pick");

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb back into Admin Courses */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Back to Admin Courses</span>
        </Link>

        <code className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {courseArn}
        </code>
      </div>

      {/* Course Profile Header Card */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {course.title}
                </h1>
                <Badge
                  variant={
                    course.publishStatus === "published"
                      ? "secondary"
                      : course.publishStatus === "pending-review"
                        ? "default"
                        : "outline"
                  }
                  className="capitalize"
                >
                  {course.publishStatus.replace("-", " ")}
                </Badge>
                <Badge variant="outline" className="text-[11px] capitalize">
                  {course.tier}
                </Badge>
                {hasRecommended && (
                  <Badge variant="default" className="gap-1 text-[10px]">
                    <Award className="size-3" aria-hidden="true" />
                    Recommended
                  </Badge>
                )}
                {hasStaffPick && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Sparkles className="size-3" aria-hidden="true" />
                    Staff Pick
                  </Badge>
                )}
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {course.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canApprove && course.publishStatus !== "published" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    updateCourse(course.id, { publishStatus: "published" })
                  }
                >
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  <span>Approve Publish</span>
                </Button>
              )}
              {canDeny && course.publishStatus !== "draft" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateCourse(course.id, { publishStatus: "draft" })
                  }
                >
                  <XCircle className="size-3.5" aria-hidden="true" />
                  <span>
                    {course.publishStatus === "pending-review"
                      ? "Deny to Draft"
                      : "Unpublish"}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Compact Profile Metrics Strip */}
          <div className="grid gap-2.5 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
              <span className="block text-[11px] text-muted-foreground">
                Enrolled Members
              </span>
              <span className="font-mono text-base font-semibold text-foreground">
                {memberCount}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
              <span className="block text-[11px] text-muted-foreground">
                Modules / Pages
              </span>
              <span className="font-mono text-base font-semibold text-foreground">
                {course.modules.length} / {totalPages}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
              <span className="block text-[11px] text-muted-foreground">
                Invite Code
              </span>
              <span className="font-mono text-base font-semibold text-foreground">
                {course.inviteCode || "—"}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
              <span className="block text-[11px] text-muted-foreground">
                Last Activity
              </span>
              <span className="text-sm font-medium text-foreground">
                {course.updatedLabel}
              </span>
            </div>
          </div>

          {/* Dedicated Profile Tabs */}
          <div
            role="tablist"
            aria-label="Course profile sections"
            className="flex flex-wrap gap-1.5 border-t border-border pt-3"
          >
            {(
              [
                { id: "settings", label: "Settings & Tags", icon: Settings },
                {
                  id: "content",
                  label: "Content & Syllabus",
                  icon: Layers,
                  badge: String(totalPages),
                },
                {
                  id: "members",
                  label: "Members & Roles",
                  icon: Users,
                  badge: String(memberCount),
                },
                {
                  id: "iam",
                  label: "Access & ARNs",
                  icon: Shield,
                  badge: String(scopedHolders.length),
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  <span>{tab.label}</span>
                  {"badge" in tab && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 font-mono text-[10px]",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-muted-foreground"
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {/* TAB 1: Settings, Metadata, Editorial Tags & Delete */}
          {activeTab === "settings" && (
            <CourseSettingsForm
              course={course}
              showAdminControls
              onDeleted={() => router.push("/admin/courses")}
            />
          )}

          {/* TAB 2: Full Syllabus & Lesson Page Editor right inside Admin */}
          {activeTab === "content" && <CourseContentEditor course={course} />}

          {/* TAB 3: Enrolled Members & Course-Scoped Roles */}
          {activeTab === "members" && (
            <div>
              {canManageMembers ? (
                <CourseMembersPanel course={course} />
              ) : (
                <p className="rounded-xl border border-border bg-surface/40 p-4 text-xs text-muted-foreground">
                  You do not hold{" "}
                  <code className="font-mono">course:members:manage</code> on{" "}
                  <code className="font-mono">{courseArn}</code>.
                </p>
              )}
            </div>
          )}

          {/* TAB 4: Access & IAM Audit for this Course ARN */}
          {activeTab === "iam" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <KeyRound
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  <span>Resource ARN &amp; Scoped Access</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  All permissions for this course evaluate against its immutable
                  ARN regardless of URL slug changes.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface/40 p-3">
                  <span className="block text-[11px] text-muted-foreground">
                    Course Resource ARN
                  </span>
                  <code className="font-mono text-xs font-semibold text-foreground">
                    {courseArn}
                  </code>
                </div>
                <div className="rounded-xl border border-border bg-surface/40 p-3">
                  <span className="block text-[11px] text-muted-foreground">
                    Pages Sub-Resource ARN
                  </span>
                  <code className="font-mono text-xs font-semibold text-foreground">
                    {arn.coursePage(course.id, "*")}
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Users with Scoped Grants on this Course (
                    {scopedHolders.length})
                  </h3>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => setActiveTab("members")}
                  >
                    Manage in Members tab
                  </Button>
                </div>

                {scopedHolders.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                    No users currently hold course-scoped grants on{" "}
                    <code className="font-mono">{course.id}</code>.
                  </p>
                ) : (
                  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                    {scopedHolders.map(({ user: holder, grant }) => {
                      const tpl = SCOPED_ROLE_TEMPLATES[grant.roleId];
                      const actions =
                        tpl?.buildStatements(course.id)[0]?.actions ?? [];
                      return (
                        <div
                          key={`${holder.id}-${grant.roleId}`}
                          className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {holder.name}
                              </span>
                              <Badge variant="secondary" className="text-[10px]">
                                {tpl?.name ?? grant.roleId}
                              </Badge>
                            </div>
                            <code className="font-mono text-[10px] text-muted-foreground">
                              {holder.id}
                            </code>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {actions.map((act) => (
                              <code
                                key={act}
                                className="rounded border border-border bg-surface/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                              >
                                {act}
                              </code>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/40 p-3.5 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Global roles ({Object.keys(roles).length} configured) can
                    also grant wildcard access across{" "}
                    <code className="font-mono text-foreground">
                      sn:course:*
                    </code>
                    .
                  </span>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/admin/roles" />}
                >
                  Open Roles &amp; Simulator
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
