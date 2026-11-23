"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  Check,
  Clock,
  KeyRound,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { arn } from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import {
  STANDARD_TOPIC_TAGS,
  type CourseRecord,
  type CourseTier,
} from "@/app/lib/courses-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SortMode = "default" | "popular" | "updated";
type UpdatedWindow = "any" | "7d" | "14d";

const REFERENCE_DATE_MS = new Date("2026-11-22T00:00:00Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

export default function CoursesHubPage() {
  const { user, can } = useAuth();
  const {
    courses,
    enrolledCourseIds,
    enrollInCourse,
    leaveCourse,
    createCourse,
    deleteCourse,
  } = useCourses();
  const router = useRouter();

  const canCreateCourse = can("course:create", arn.course("*"));

  // Inline Create Course form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftInvite, setDraftInvite] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>(["Accessibility"]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const createTitleId = useId();
  const createSummaryId = useId();
  const createInviteId = useId();

  // Invite code form state
  const [inviteInput, setInviteInput] = useState("");
  const [inviteMessage, setInviteMessage] = useState<{
    tone: "success" | "info" | "error";
    text: string;
  } | null>(null);

  // Public catalog filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [updatedWindow, setUpdatedWindow] = useState<UpdatedWindow>("any");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const enrolledSet = useMemo(
    () => new Set(enrolledCourseIds),
    [enrolledCourseIds]
  );

  // "My Courses" includes enrolled courses + any course the user owns/edits (including drafts)
  const myCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          enrolledSet.has(c.id) ||
          can("course:edit", arn.course(c.id)) ||
          c.createdByUserId === user?.id
      ),
    [courses, enrolledSet, can, user?.id]
  );

  const publicCourses = useMemo(
    () => courses.filter((c) => c.publishStatus === "published"),
    [courses]
  );

  const allAvailableTags = useMemo(
    () =>
      Array.from(new Set(publicCourses.flatMap((c) => c.tags))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [publicCourses]
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleCreateCourseSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;
    const created = createCourse({
      title: draftTitle,
      summary: draftSummary,
      tags: draftTags,
      inviteCode: draftInvite,
    });
    if (!created) return;
    setDraftTitle("");
    setDraftSummary("");
    setDraftInvite("");
    setDraftTags(["Accessibility"]);
    setShowCreateForm(false);
    router.push(`/app/courses/${created.slug}`);
  };

  const handleInviteSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = inviteInput.trim().toUpperCase();
    if (!cleaned) {
      setInviteMessage({
        tone: "error",
        text: "Please enter an invite code.",
      });
      return;
    }

    const match = courses.find(
      (c) => c.inviteCode?.toUpperCase() === cleaned
    );

    if (match) {
      if (enrolledSet.has(match.id)) {
        setInviteMessage({
          tone: "info",
          text: `You are already enrolled in "${match.title}".`,
        });
      } else {
        enrollInCourse(match.id);
        setInviteMessage({
          tone: "success",
          text: `Joined "${match.title}" — added to My Courses below.`,
        });
      }
      setInviteInput("");
      return;
    }

    setInviteMessage({
      tone: "info",
      text: `No course found for "${cleaned}". Try OSS-300 or BIO-101.`,
    });
  };

  const filteredPublicCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = publicCourses.filter((course) => {
      if (q) {
        const haystack =
          `${course.title} ${course.summary} ${course.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (selectedTags.length > 0) {
        const hasMatch = selectedTags.some((tag) => course.tags.includes(tag));
        if (!hasMatch) return false;
      }

      if (updatedWindow !== "any") {
        const courseMs = new Date(`${course.updatedAt}T00:00:00Z`).getTime();
        const ageDays = Math.max(0, (REFERENCE_DATE_MS - courseMs) / DAY_MS);
        const maxDays = updatedWindow === "7d" ? 7 : 14;
        if (ageDays > maxDays) return false;
      }

      return true;
    });

    if (sortMode === "popular") {
      return [...filtered].sort((a, b) => b.enrolledCount - a.enrolledCount);
    }
    if (sortMode === "updated") {
      return [...filtered].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
    }
    return filtered;
  }, [publicCourses, searchQuery, selectedTags, updatedWindow, sortMode]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedTags.length > 0 ||
    updatedWindow !== "any" ||
    sortMode !== "default";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setUpdatedWindow("any");
    setSortMode("default");
  };

  const publicSections: {
    tier: CourseTier;
    heading: string;
    description: string;
    icon: typeof Sparkles;
    courses: CourseRecord[];
  }[] = [
    {
      tier: "featured",
      heading: "Featured",
      description: "Curated starter courses and community highlights.",
      icon: Sparkles,
      courses: filteredPublicCourses.filter((c) => c.tier === "featured"),
    },
    {
      tier: "popular",
      heading: "Popular",
      description: "Most actively studied courses across Shy Notes.",
      icon: TrendingUp,
      courses: filteredPublicCourses.filter((c) => c.tier === "popular"),
    },
    {
      tier: "other",
      heading: "Everything Else",
      description: "Additional community-maintained courses and note collections.",
      icon: BookOpen,
      courses: filteredPublicCourses.filter((c) => c.tier === "other"),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8 pb-20 sm:px-6">
      {/* Page Header + Join by Invite Code */}
      <section className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="space-y-2 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Courses</h1>
            {user && <Badge variant="secondary">{user.roleSummary}</Badge>}
            {canCreateCourse && (
              <Button
                type="button"
                size="sm"
                className="ml-auto sm:ml-2"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Create Course</span>
              </Button>
            )}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Pick up where you left off, create a new draft course (saved to{" "}
            <code className="font-mono text-xs">localStorage</code>), join with
            an invite code, or explore published courses.
          </p>
        </div>

        {/* Join by Invite Code */}
        <Card size="sm" className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <KeyRound
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span>Join a course by invite code</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Have a class or study-group code? Try{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                OSS-300
              </code>{" "}
              or{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                BIO-101
              </code>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <form onSubmit={handleInviteSubmit} className="flex gap-2">
              <label htmlFor="course-invite-code" className="sr-only">
                Course invite code
              </label>
              <Input
                id="course-invite-code"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="e.g. OSS-300"
                className="h-9 font-mono uppercase"
              />
              <Button type="submit" size="lg">
                Join
              </Button>
            </form>
            {inviteMessage && (
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "text-xs",
                  inviteMessage.tone === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {inviteMessage.text}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Inline Create Course Card */}
      {showCreateForm && canCreateCourse && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create a New Course</CardTitle>
            <CardDescription className="text-xs">
              Starts as a private <strong>Draft</strong> owned by your account (
              <code className="font-mono">course_owner</code> scoped grant
              attached automatically). Submit it for review whenever you&apos;re
              ready to publish.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCourseSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="space-y-1 sm:col-span-8">
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
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="e.g. Intro to Organic Chemistry"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:col-span-4">
                  <label
                    htmlFor={createInviteId}
                    className="block text-xs font-medium text-foreground"
                  >
                    Invite code (optional)
                  </label>
                  <Input
                    id={createInviteId}
                    value={draftInvite}
                    onChange={(e) => setDraftInvite(e.target.value)}
                    placeholder="e.g. CHEM-101"
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={createSummaryId}
                  className="block text-xs font-medium text-foreground"
                >
                  Short summary
                </label>
                <textarea
                  id={createSummaryId}
                  rows={2}
                  value={draftSummary}
                  onChange={(e) => setDraftSummary(e.target.value)}
                  placeholder="What learners will study in these notes…"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-foreground">
                  Topic tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_TOPIC_TAGS.map((tag) => {
                    const active = draftTags.includes(tag);
                    return (
                      <Button
                        key={tag}
                        type="button"
                        size="xs"
                        variant={active ? "default" : "outline"}
                        aria-pressed={active}
                        onClick={() =>
                          setDraftTags((prev) =>
                            prev.includes(tag)
                              ? prev.filter((t) => t !== tag)
                              : [...prev, tag]
                          )
                        }
                      >
                        {active && (
                          <Check className="size-3" aria-hidden="true" />
                        )}
                        <span>{tag}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={!draftTitle.trim()}>
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Create Draft &amp; Open</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* My Courses Section (Enrolled + Owned/Drafts) */}
      {myCourses.length > 0 && (
        <section aria-labelledby="enrolled-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="enrolled-heading"
                className="text-xl font-semibold tracking-tight"
              >
                My Courses
              </h2>
              <p className="text-sm text-muted-foreground">
                Courses you are studying, drafting, or maintaining.
              </p>
            </div>
            <Badge variant="outline">
              {myCourses.length}{" "}
              {myCourses.length === 1 ? "course" : "courses"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {myCourses.map((course) => {
              const courseResource = arn.course(course.id);
              const canEditThisCourse = can("course:edit", courseResource);
              const canDeleteThisCourse = can("course:delete", courseResource);
              const isRecommended = course.curatedTagIds?.includes(
                "tag_curated_recommended"
              );
              const isEnrolled = enrolledSet.has(course.id);

              return (
                <Card
                  key={course.id}
                  className="flex flex-col justify-between"
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CardTitle className="text-lg">
                          {course.title}
                        </CardTitle>
                        {course.publishStatus !== "published" && (
                          <Badge
                            variant={
                              course.publishStatus === "pending-review"
                                ? "default"
                                : "outline"
                            }
                            className="text-[10px] capitalize"
                          >
                            {course.publishStatus.replace("-", " ")}
                          </Badge>
                        )}
                        {isRecommended && (
                          <Badge
                            variant="default"
                            className="gap-1 text-[10px]"
                          >
                            <Award className="size-3" aria-hidden="true" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {course.updatedLabel}
                      </span>
                    </div>
                    <CardDescription>{course.summary}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Content reviewed
                        </span>
                        <span className="font-medium text-foreground">
                          {course.progressPercent}%
                        </span>
                      </div>
                      <progress
                        className="sn-progress"
                        value={course.progressPercent}
                        max={100}
                        aria-label={`${course.title} review progress: ${course.progressPercent}%`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {course.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                    <Button
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/app/courses/${course.slug}`} />}
                    >
                      <BookOpen className="size-4" aria-hidden="true" />
                      <span>
                        {canEditThisCourse ? "Open & Edit" : "Continue Course"}
                      </span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                      {canDeleteThisCourse &&
                        (confirmDeleteId === course.id ? (
                          <>
                            <Button
                              type="button"
                              size="xs"
                              variant="destructive"
                              onClick={() => {
                                deleteCourse(course.id);
                                setConfirmDeleteId(null);
                              }}
                            >
                              Confirm delete
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Delete ${course.title}`}
                            title="Delete course"
                            onClick={() => setConfirmDeleteId(course.id)}
                          >
                            <Trash2
                              className="size-3.5 text-muted-foreground hover:text-destructive"
                              aria-hidden="true"
                            />
                          </Button>
                        ))}

                      {isEnrolled && !canEditThisCourse && (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => leaveCourse(course.id)}
                        >
                          Leave
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <Separator className="mt-8" />
        </section>
      )}

      {/* Publicly Available Courses + Filter Controls */}
      <section aria-labelledby="public-courses-heading" className="space-y-6">
        <div className="space-y-1">
          <h2
            id="public-courses-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Publicly Available Courses
          </h2>
          <p className="text-sm text-muted-foreground">
            Browse published courses—filter by tags or last updated time.
          </p>
        </div>

        {/* Filter & Sort Panel */}
        <div className="space-y-4 rounded-xl border border-border bg-surface/60 p-4">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="relative md:col-span-6">
              <label htmlFor="course-search" className="sr-only">
                Search public courses
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="course-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, topic, or description…"
                className="h-9 bg-background pl-9"
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-3">
              <label
                htmlFor="course-updated-filter"
                className="shrink-0 text-xs font-medium text-muted-foreground"
              >
                Updated
              </label>
              <select
                id="course-updated-filter"
                value={updatedWindow}
                onChange={(e) =>
                  setUpdatedWindow(e.target.value as UpdatedWindow)
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="any">Any time</option>
                <option value="7d">Last 7 days</option>
                <option value="14d">Last 14 days</option>
              </select>
            </div>

            <div className="flex items-center gap-2 md:col-span-3">
              <label
                htmlFor="course-sort"
                className="shrink-0 text-xs font-medium text-muted-foreground"
              >
                Sort
              </label>
              <select
                id="course-sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="default">Featured first</option>
                <option value="popular">Most popular</option>
                <option value="updated">Recently updated</option>
              </select>
            </div>
          </div>

          {/* Tag Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Tags:
            </span>
            {allAvailableTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <Button
                  key={tag}
                  type="button"
                  size="xs"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Button>
              );
            })}
            {hasActiveFilters && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={clearFilters}
                className="ml-auto text-muted-foreground"
              >
                <X className="size-3" aria-hidden="true" />
                <span>Clear filters</span>
              </Button>
            )}
          </div>
        </div>

        {/* Public Results */}
        {filteredPublicCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                No published courses match your current filters.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearFilters}
              >
                Reset filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {publicSections
              .filter((section) => section.courses.length > 0)
              .map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.tier} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      <h3 className="text-base font-semibold text-foreground">
                        {section.heading}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        — {section.description}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {section.courses.map((course) => {
                        const isEnrolled = enrolledSet.has(course.id);
                        const isRecommended = course.curatedTagIds?.includes(
                          "tag_curated_recommended"
                        );
                        return (
                          <Card
                            key={course.id}
                            size="sm"
                            className="flex flex-col justify-between"
                          >
                            <CardHeader>
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <CardTitle className="text-base">
                                  {course.title}
                                </CardTitle>
                                {isRecommended && (
                                  <Badge
                                    variant="default"
                                    className="gap-1 text-[10px]"
                                  >
                                    <Award
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="line-clamp-3">
                                {course.summary}
                              </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-2.5">
                              <div className="flex flex-wrap gap-1">
                                {course.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[11px]"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Users
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                  {course.enrolledCount.toLocaleString()}
                                </span>
                                <span>{course.updatedLabel}</span>
                              </div>
                            </CardContent>

                            <CardFooter className="flex items-center justify-between gap-2 border-t pt-3">
                              <Button
                                size="xs"
                                variant={isEnrolled ? "secondary" : "default"}
                                nativeButton={false}
                                render={
                                  <Link href={`/app/courses/${course.slug}`} />
                                }
                              >
                                {isEnrolled ? "Open Course" : "Preview"}
                              </Button>
                              {!isEnrolled && (
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => enrollInCourse(course.id)}
                                >
                                  Enroll
                                </Button>
                              )}
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </main>
  );
}
