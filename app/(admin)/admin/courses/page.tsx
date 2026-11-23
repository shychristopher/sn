"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { arn } from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import {
  STANDARD_TOPIC_TAGS,
  flattenCoursePages,
  type CoursePublishStatus,
  type CourseTier,
} from "@/app/lib/courses-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StatusFilter = "all" | CoursePublishStatus;

export default function AdminCoursesPage() {
  const { can } = useAuth();
  const {
    courses,
    hasCustomCourses,
    getEnrolledUserIdsForCourse,
    createCourse,
    updateCourse,
    resetCourses,
  } = useCourses();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Create Course form state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newTier, setNewTier] = useState<CourseTier>("other");
  const [newStatus, setNewStatus] = useState<CoursePublishStatus>("published");
  const [newInvite, setNewInvite] = useState("");
  const [newTags, setNewTags] = useState<string[]>(["Accessibility"]);

  const searchId = useId();
  const createTitleId = useId();
  const createSummaryId = useId();

  const canCreate = can("course:create", arn.course("*"));
  const canDirectPublish = can("course:review:approve", arn.course("*"));

  const statusCounts = useMemo(
    () => ({
      all: courses.length,
      "pending-review": courses.filter(
        (c) => c.publishStatus === "pending-review"
      ).length,
      published: courses.filter((c) => c.publishStatus === "published").length,
      draft: courses.filter((c) => c.publishStatus === "draft").length,
    }),
    [courses]
  );

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (statusFilter !== "all" && c.publishStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.inviteCode?.toLowerCase().includes(q) ?? false) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [courses, search, statusFilter]);

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = createCourse({
      title: newTitle,
      summary: newSummary,
      tier: newTier,
      publishStatus: canDirectPublish ? newStatus : "draft",
      inviteCode: newInvite,
      tags: newTags,
    });
    setNewTitle("");
    setNewSummary("");
    setNewInvite("");
    setNewTier("other");
    setNewTags(["Accessibility"]);
    setShowCreate(false);
    if (created) {
      router.push(`/admin/courses/${created.id}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {courses.length}
            </Badge>
            {statusCounts["pending-review"] > 0 && (
              <Badge variant="default" className="text-xs">
                {statusCounts["pending-review"]} pending review
              </Badge>
            )}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Search the course catalog and open any course&apos;s dedicated admin
            profile to edit settings, syllabus content, protected tags, and
            enrolled members without leaving the Admin Console.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasCustomCourses && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetCourses}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Reset starter courses</span>
            </Button>
          )}
          {canCreate && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreate((v) => !v)}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>New Course</span>
            </Button>
          )}
        </div>
      </div>

      {/* Inline Admin Create Course Card */}
      {showCreate && canCreate && (
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create Course</CardTitle>
            <CardDescription className="text-xs">
              Creates the course in{" "}
              <code className="font-mono">localStorage</code> and opens its
              Admin Course Profile directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="space-y-1 sm:col-span-5">
                  <label
                    htmlFor={createTitleId}
                    className="block text-xs font-medium text-foreground"
                  >
                    Course title
                  </label>
                  <Input
                    id={createTitleId}
                    autoFocus
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Intro to Databases"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground">
                    Tier
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as CourseTier)}
                    className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                  >
                    <option value="featured">Featured</option>
                    <option value="popular">Popular</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="block text-xs font-medium text-foreground">
                    Initial status
                  </label>
                  <select
                    value={canDirectPublish ? newStatus : "draft"}
                    disabled={!canDirectPublish}
                    onChange={(e) =>
                      setNewStatus(e.target.value as CoursePublishStatus)
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground disabled:opacity-60"
                  >
                    <option value="published">Published</option>
                    <option value="pending-review">Pending Review</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground">
                    Invite code
                  </label>
                  <Input
                    value={newInvite}
                    onChange={(e) => setNewInvite(e.target.value)}
                    placeholder="DB-101"
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={createSummaryId}
                  className="block text-xs font-medium text-foreground"
                >
                  Summary
                </label>
                <Input
                  id={createSummaryId}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Brief overview of what this course covers…"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {STANDARD_TOPIC_TAGS.map((tag) => {
                  const active = newTags.includes(tag);
                  return (
                    <Button
                      key={tag}
                      type="button"
                      size="xs"
                      variant={active ? "default" : "outline"}
                      onClick={() =>
                        setNewTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                    >
                      {tag}
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={!newTitle.trim()}>
                  Create &amp; Manage Course
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/50 p-3">
        <div className="relative w-full max-w-md">
          <label htmlFor={searchId} className="sr-only">
            Search courses by name, ID, invite code, or tag
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course name, ID, invite code, or tag…"
            className="h-9 bg-background pl-8 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "all", label: `All (${statusCounts.all})` },
              {
                id: "pending-review",
                label: `Pending (${statusCounts["pending-review"]})`,
              },
              {
                id: "published",
                label: `Published (${statusCounts.published})`,
              },
              { id: "draft", label: `Draft (${statusCounts.draft})` },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="xs"
              variant={statusFilter === tab.id ? "default" : "ghost"}
              aria-pressed={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Course Directory Table / List */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No courses match your search or status filter.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {filteredCourses.map((course) => {
            const courseArn = arn.course(course.id);
            const canApprove = can("course:review:approve", courseArn);
            const canDeny = can("course:review:deny", courseArn);
            const memberCount = getEnrolledUserIdsForCourse(course.id).length;
            const pageCount = flattenCoursePages(course.modules).length;
            const hasRecommended = course.curatedTagIds.includes(
              "tag_curated_recommended"
            );
            const hasStaffPick = course.curatedTagIds.includes(
              "tag_curated_staff_pick"
            );

            return (
              <div
                key={course.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-surface/40"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="text-base font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      {course.title}
                    </Link>
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
                    <Badge variant="outline" className="text-[10px] capitalize">
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

                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {course.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {courseArn}
                    </code>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" aria-hidden="true" />
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3" aria-hidden="true" />
                      {course.modules.length} modules · {pageCount} pages
                    </span>
                    <span>{course.updatedLabel}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {canApprove && course.publishStatus === "pending-review" && (
                    <Button
                      type="button"
                      size="xs"
                      onClick={() =>
                        updateCourse(course.id, { publishStatus: "published" })
                      }
                    >
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      <span>Approve</span>
                    </Button>
                  )}
                  {canDeny && course.publishStatus === "pending-review" && (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        updateCourse(course.id, { publishStatus: "draft" })
                      }
                    >
                      <XCircle className="size-3" aria-hidden="true" />
                      <span>Deny</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/admin/courses/${course.id}`} />}
                  >
                    <span>Manage</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
