"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Bookmark,
  BookMarked,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  EyeOff,
  GitPullRequest,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Send,
  Settings,
  StickyNote,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { arn } from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import { useAccessibility } from "@/app/lib/accessibility-context";
import { READING_WIDTH_OPTIONS } from "@/app/lib/a11y-typography";
import {
  DEFAULT_PAGE_BODY,
  DEFAULT_PAGE_SUMMARY,
  flattenCoursePages,
  type CoursePageNode,
  type CourseRecord,
  type PageReviewStatus,
} from "@/app/lib/courses-data";
import { CoursePrintControls } from "@/app/components/course-print-controls";
import { CourseSettingsForm } from "@/app/components/course-settings-form";
import { CourseMembersPanel } from "@/app/components/course-members-panel";
import { BionicText } from "@/app/components/bionic-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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

type SidebarMode = "expanded" | "compact" | "hidden";
type DynamicSectionId =
  | "glossary"
  | "bookmarks"
  | "notes"
  | "suggestions"
  | "analytics"
  | "settings";

interface DynamicSectionItem {
  id: DynamicSectionId;
  label: string;
  icon: typeof BookMarked;
  badge?: string;
}

function StatusIcon({
  status,
  className,
}: {
  status: PageReviewStatus;
  className?: string;
}) {
  if (status === "reviewed") {
    return (
      <CheckCircle2
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-emerald-600 dark:text-emerald-400",
          className
        )}
      />
    );
  }
  if (status === "in-progress") {
    return (
      <Clock
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-amber-600 dark:text-amber-400",
          className
        )}
      />
    );
  }
  return (
    <Circle
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-muted-foreground/70", className)}
    />
  );
}

const STATUS_LABELS: Record<PageReviewStatus, string> = {
  reviewed: "Reviewed",
  "in-progress": "In progress",
  "not-started": "Not started",
};

const NEXT_STATUS: Record<PageReviewStatus, PageReviewStatus> = {
  "not-started": "in-progress",
  "in-progress": "reviewed",
  reviewed: "not-started",
};

export function CourseWorkspace({ slug }: { slug: string }) {
  const { getCourseBySlug, isHydrated } = useCourses();
  const course = getCourseBySlug(slug);

  if (!course) {
    if (!isHydrated) {
      return (
        <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
          Loading course…
        </div>
      );
    }

    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Course not found
        </h1>
        <p className="text-sm text-muted-foreground">
          This course may have been deleted or its URL slug is no longer valid.
        </p>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/app" />}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Back to Courses</span>
        </Button>
      </main>
    );
  }

  return <CourseWorkspaceLoaded key={course.id} course={course} />;
}

function CourseWorkspaceLoaded({ course }: { course: CourseRecord }) {
  const { can } = useAuth();
  const {
    updateCourse,
    toggleCuratedTag,
    addModule,
    deleteModule,
    addPage,
    updatePage,
    deletePage,
  } = useCourses();
  const { settings } = useAccessibility();
  const router = useRouter();

  const courseArn = arn.course(course.id);
  const recommendedTagArn = arn.tag("tag_curated_recommended");

  const canEdit = can("course:edit", courseArn);
  const canSubmitPublish = can("course:publish:submit", courseArn);
  const canReviewApprove = can("course:review:approve", courseArn);
  const canReviewDeny = can("course:review:deny", courseArn);
  const canSuggest = can("course:suggestions:create", courseArn);
  const canApproveSuggestions = can("course:suggestions:approve", courseArn);
  const canViewAnalytics = can("course:analytics:read", courseArn);
  const canManageSettings = can("course:settings:manage", courseArn);
  const canManageMembers =
    can("course:members:manage", courseArn) || canManageSettings;
  const canApplyRecommendedTag = can("tag:apply", recommendedTagArn);

  const readingMeasure =
    READING_WIDTH_OPTIONS.find((w) => w.id === settings.typography.readingWidth)
      ?.measure ?? "100%";

  const flatPages = useMemo(
    () => flattenCoursePages(course.modules),
    [course.modules]
  );

  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("expanded");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activePageId, setActivePageId] = useState<string>(
    flatPages[0]?.id ?? ""
  );
  const [activeSection, setActiveSection] = useState<DynamicSectionId | null>(
    null
  );

  // Inline creation drafts in the sidebar
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingPageInModuleId, setAddingPageInModuleId] = useState<
    string | null
  >(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [addingSubpageInPageId, setAddingSubpageInPageId] = useState<
    string | null
  >(null);
  const [newSubpageTitle, setNewSubpageTitle] = useState("");

  // Inline page editing state
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [draftPageTitle, setDraftPageTitle] = useState("");
  const [draftPageSummary, setDraftPageSummary] = useState("");
  const [draftPageBody, setDraftPageBody] = useState("");

  // Local study review status per page
  const [pageStatuses, setPageStatuses] = useState<
    Record<string, PageReviewStatus>
  >(() =>
    Object.fromEntries(flatPages.map((page) => [page.id, page.status]))
  );

  const totalPages = flatPages.length;
  const reviewedCount = useMemo(
    () =>
      flatPages.filter((p) => (pageStatuses[p.id] ?? p.status) === "reviewed")
        .length,
    [flatPages, pageStatuses]
  );
  const progressPercent =
    totalPages > 0 ? Math.round((reviewedCount / totalPages) * 100) : 0;

  const activePage: CoursePageNode | undefined =
    flatPages.find((p) => p.id === activePageId) ?? flatPages[0];
  const activePageStatus = activePage
    ? (pageStatuses[activePage.id] ?? activePage.status)
    : "not-started";
  const activePageSummary = activePage?.summary ?? DEFAULT_PAGE_SUMMARY;
  const activePageBody = activePage?.body ?? DEFAULT_PAGE_BODY;
  const activeParagraphs = activePageBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const recommendedApplied = Boolean(
    course.curatedTagIds?.includes("tag_curated_recommended")
  );

  const dynamicSections: DynamicSectionItem[] = useMemo(() => {
    const base: DynamicSectionItem[] = [
      { id: "glossary", label: "Glossary", icon: BookMarked },
      { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
      { id: "notes", label: "My Notes", icon: StickyNote },
    ];
    if (canApproveSuggestions) {
      base.push({
        id: "suggestions",
        label: "Suggestions",
        icon: GitPullRequest,
        badge:
          course.pendingSuggestions > 0
            ? String(course.pendingSuggestions)
            : undefined,
      });
    }
    if (canViewAnalytics) {
      base.push({ id: "analytics", label: "Analytics", icon: BarChart3 });
    }
    if (canManageSettings || canManageMembers) {
      base.push({
        id: "settings",
        label: canManageSettings ? "Settings" : "Members",
        icon: Settings,
      });
    }
    return base;
  }, [
    canApproveSuggestions,
    canViewAnalytics,
    canManageSettings,
    canManageMembers,
    course.pendingSuggestions,
  ]);

  const handleSelectPage = (pageId: string) => {
    setActivePageId(pageId);
    setActiveSection(null);
    setIsEditingPage(false);
    setMobileNavOpen(false);
  };

  const handleSelectSection = (sectionId: DynamicSectionId) => {
    setActiveSection((prev) => (prev === sectionId ? null : sectionId));
    setIsEditingPage(false);
    setMobileNavOpen(false);
  };

  const cycleActivePageStatus = () => {
    if (!activePage) return;
    setPageStatuses((prev) => {
      const current = prev[activePage.id] ?? activePage.status;
      return { ...prev, [activePage.id]: NEXT_STATUS[current] };
    });
  };

  const handleStartEditPage = () => {
    if (!activePage) return;
    setDraftPageTitle(activePage.title);
    setDraftPageSummary(activePageSummary);
    setDraftPageBody(activePageBody);
    setIsEditingPage(true);
  };

  const handleSaveEditPage = (e: FormEvent) => {
    e.preventDefault();
    if (!activePage) return;
    const trimmedTitle = draftPageTitle.trim();
    if (!trimmedTitle) return;
    updatePage(course.id, activePage.id, {
      title: trimmedTitle,
      summary: draftPageSummary.trim() || DEFAULT_PAGE_SUMMARY,
      body: draftPageBody.trim() || DEFAULT_PAGE_BODY,
    });
    setIsEditingPage(false);
  };

  const handleCreateModule = (e: FormEvent) => {
    e.preventDefault();
    const res = addModule(course.id, newModuleTitle);
    if (!res) return;
    setNewModuleTitle("");
    setAddingModule(false);
    setActivePageId(res.firstPageId);
    setActiveSection(null);
  };

  const handleCreatePage = (e: FormEvent, moduleId: string) => {
    e.preventDefault();
    const newId = addPage(course.id, moduleId, newPageTitle);
    if (!newId) return;
    setNewPageTitle("");
    setAddingPageInModuleId(null);
    setActivePageId(newId);
    setActiveSection(null);
  };

  const handleCreateSubpage = (
    e: FormEvent,
    moduleId: string,
    parentPageId: string
  ) => {
    e.preventDefault();
    const newId = addPage(course.id, moduleId, newSubpageTitle, parentPageId);
    if (!newId) return;
    setNewSubpageTitle("");
    setAddingSubpageInPageId(null);
    setActivePageId(newId);
    setActiveSection(null);
  };

  const renderExpandedSidebarBody = (isMobile: boolean) => (
    <div className="flex h-full min-h-0 flex-col">
      {/* 1. Fixed Top Header: Back link + Course Title + Progress Bar */}
      <div className="shrink-0 space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/app"
            onClick={() => setMobileNavOpen(false)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Back to Courses</span>
          </Link>

          {isMobile ? (
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close course navigation"
                />
              }
            >
              <X className="size-4" aria-hidden="true" />
            </SheetClose>
          ) : (
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Collapse sidebar to icons"
                      onClick={() => setSidebarMode("compact")}
                    />
                  }
                >
                  <PanelLeftClose className="size-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Collapse to icons</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Hide sidebar"
                      onClick={() => setSidebarMode("hidden")}
                    />
                  }
                >
                  <EyeOff className="size-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Hide sidebar</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold leading-snug text-foreground">
            {course.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {course.updatedLabel}
          </p>

          {/* Inline publish / review / curated-tag pills */}
          {(recommendedApplied ||
            canApplyRecommendedTag ||
            canSubmitPublish ||
            canReviewApprove ||
            canReviewDeny ||
            course.publishStatus !== "published") && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {canApplyRecommendedTag ? (
                <button
                  type="button"
                  aria-pressed={recommendedApplied}
                  onClick={() =>
                    toggleCuratedTag(course.id, "tag_curated_recommended")
                  }
                  title={`Toggle Recommended tag (${recommendedTagArn})`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                    recommendedApplied
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-dashed border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  )}
                >
                  <Award className="size-3" aria-hidden="true" />
                  <span>
                    {recommendedApplied ? "Recommended" : "+ Recommended"}
                  </span>
                </button>
              ) : (
                recommendedApplied && (
                  <Badge variant="default" className="h-5 gap-1 text-[10px]">
                    <Award className="size-3" aria-hidden="true" />
                    Recommended
                  </Badge>
                )
              )}

              {course.publishStatus !== "published" && (
                <Badge
                  variant={
                    course.publishStatus === "pending-review"
                      ? "secondary"
                      : "outline"
                  }
                  className="h-5 text-[10px] capitalize"
                >
                  {course.publishStatus.replace("-", " ")}
                </Badge>
              )}

              {canSubmitPublish && course.publishStatus === "draft" && (
                <button
                  type="button"
                  onClick={() =>
                    updateCourse(course.id, { publishStatus: "pending-review" })
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  <Send className="size-2.5" aria-hidden="true" />
                  <span>Submit for review</span>
                </button>
              )}

              {canReviewApprove && course.publishStatus !== "published" && (
                <button
                  type="button"
                  onClick={() =>
                    updateCourse(course.id, { publishStatus: "published" })
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  <span>Approve</span>
                </button>
              )}

              {canReviewDeny && course.publishStatus === "pending-review" && (
                <button
                  type="button"
                  onClick={() =>
                    updateCourse(course.id, { publishStatus: "draft" })
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  <XCircle className="size-3" aria-hidden="true" />
                  <span>Deny</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Reviewed Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {reviewedCount} of {totalPages} reviewed
            </span>
            <span className="font-mono font-medium text-foreground">
              {progressPercent}%
            </span>
          </div>
          <progress
            className="sn-progress"
            value={reviewedCount}
            max={Math.max(1, totalPages)}
            aria-label={`Course review progress: ${reviewedCount} of ${totalPages} pages (${progressPercent}%)`}
          />
        </div>
      </div>

      {/* 2. Short List of Dynamic Sections */}
      <div className="shrink-0 border-b border-border px-3 py-3">
        <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Course Tools
        </p>
        <ul className="space-y-0.5">
          {dynamicSections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => handleSelectSection(section.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground ring-1 ring-border"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{section.label}</span>
                  {section.badge && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {section.badge}
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 3. Scrollable Dynamic Course Content Tree */}
      <nav
        aria-label="Course content"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Course Content
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setAddingModule((v) => !v)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Create new module"
            >
              <Plus className="size-3" aria-hidden="true" />
              <span>Module</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          {course.modules.map((mod) => (
            <div key={mod.id} className="space-y-1">
              <div className="group flex items-center justify-between gap-1 px-2">
                <p className="truncate text-xs font-semibold text-foreground">
                  {mod.title}
                </p>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`Add page to ${mod.title}`}
                      title="Add page to module"
                      onClick={() => {
                        setAddingPageInModuleId((prev) =>
                          prev === mod.id ? null : mod.id
                        );
                        setNewPageTitle("");
                      }}
                      className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                    </button>
                    {course.modules.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Delete ${mod.title}`}
                        title="Delete module"
                        onClick={() => deleteModule(course.id, mod.id)}
                        className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-0.5">
                {mod.pages.map((page) => {
                  const status = pageStatuses[page.id] ?? page.status;
                  const isActive =
                    activeSection === null && activePage?.id === page.id;

                  return (
                    <li key={page.id} className="space-y-0.5">
                      <div className="group flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleSelectPage(page.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                            isActive
                              ? "bg-accent font-medium text-accent-foreground ring-1 ring-border"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          )}
                        >
                          <StatusIcon status={status} className="size-4" />
                          <span className="truncate">{page.title}</span>
                          <span className="sr-only">
                            ({STATUS_LABELS[status]})
                          </span>
                        </button>

                        {canEdit && (
                          <div className="flex shrink-0 items-center">
                            <button
                              type="button"
                              aria-label={`Add subpage under ${page.title}`}
                              title="Add subpage"
                              onClick={() => {
                                setAddingSubpageInPageId((prev) =>
                                  prev === page.id ? null : page.id
                                );
                                setNewSubpageTitle("");
                              }}
                              className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                            >
                              <Plus className="size-3.5" aria-hidden="true" />
                            </button>
                            {totalPages > 1 && (
                              <button
                                type="button"
                                aria-label={`Delete ${page.title}`}
                                title="Delete page"
                                onClick={() => deletePage(course.id, page.id)}
                                className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                              >
                                <Trash2 className="size-3" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Nested subpages + inline subpage creator */}
                      {((page.subpages && page.subpages.length > 0) ||
                        addingSubpageInPageId === page.id) && (
                        <ul className="ml-4 space-y-0.5 border-l border-border pl-2">
                          {page.subpages?.map((sub) => {
                            const subStatus =
                              pageStatuses[sub.id] ?? sub.status;
                            const subActive =
                              activeSection === null &&
                              activePage?.id === sub.id;
                            return (
                              <li
                                key={sub.id}
                                className="group flex items-center gap-0.5"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectPage(sub.id)}
                                  aria-current={subActive ? "page" : undefined}
                                  className={cn(
                                    "flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors",
                                    subActive
                                      ? "bg-accent font-medium text-accent-foreground ring-1 ring-border"
                                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                  )}
                                >
                                  <StatusIcon
                                    status={subStatus}
                                    className="size-4"
                                  />
                                  <span className="truncate">{sub.title}</span>
                                  <span className="sr-only">
                                    ({STATUS_LABELS[subStatus]})
                                  </span>
                                </button>
                                {canEdit && totalPages > 1 && (
                                  <button
                                    type="button"
                                    aria-label={`Delete ${sub.title}`}
                                    title="Delete subpage"
                                    onClick={() =>
                                      deletePage(course.id, sub.id)
                                    }
                                    className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                                  >
                                    <Trash2
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                  </button>
                                )}
                              </li>
                            );
                          })}

                          {canEdit && addingSubpageInPageId === page.id && (
                            <li className="pt-1">
                              <form
                                onSubmit={(e) =>
                                  handleCreateSubpage(e, mod.id, page.id)
                                }
                                className="flex items-center gap-1"
                              >
                                <Input
                                  autoFocus
                                  value={newSubpageTitle}
                                  onChange={(e) =>
                                    setNewSubpageTitle(e.target.value)
                                  }
                                  placeholder="Subpage title…"
                                  className="h-7 bg-background text-xs"
                                />
                                <Button
                                  type="submit"
                                  size="icon-xs"
                                  aria-label="Save subpage"
                                  disabled={!newSubpageTitle.trim()}
                                >
                                  <Check className="size-3" aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Cancel subpage"
                                  onClick={() => setAddingSubpageInPageId(null)}
                                >
                                  <X className="size-3" aria-hidden="true" />
                                </Button>
                              </form>
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}

                {canEdit && (
                  <li className="pt-0.5">
                    {addingPageInModuleId === mod.id ? (
                      <form
                        onSubmit={(e) => handleCreatePage(e, mod.id)}
                        className="flex items-center gap-1 px-1"
                      >
                        <Input
                          autoFocus
                          value={newPageTitle}
                          onChange={(e) => setNewPageTitle(e.target.value)}
                          placeholder="New page title…"
                          className="h-7 bg-background text-xs"
                        />
                        <Button
                          type="submit"
                          size="icon-xs"
                          aria-label="Save page"
                          disabled={!newPageTitle.trim()}
                        >
                          <Check className="size-3" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Cancel page"
                          onClick={() => setAddingPageInModuleId(null)}
                        >
                          <X className="size-3" aria-hidden="true" />
                        </Button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingPageInModuleId(mod.id);
                          setNewPageTitle("");
                        }}
                        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        <Plus className="size-3" aria-hidden="true" />
                        <span>New page</span>
                      </button>
                    )}
                  </li>
                )}
              </ul>
            </div>
          ))}

          {canEdit && (
            <div className="pt-1">
              {addingModule ? (
                <form
                  onSubmit={handleCreateModule}
                  className="flex items-center gap-1 px-1"
                >
                  <Input
                    autoFocus
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="Module title…"
                    className="h-8 bg-background text-xs"
                  />
                  <Button
                    type="submit"
                    size="icon-xs"
                    aria-label="Save module"
                    disabled={!newModuleTitle.trim()}
                  >
                    <Check className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Cancel module"
                    onClick={() => {
                      setAddingModule(false);
                      setNewModuleTitle("");
                    }}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingModule(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>New Module</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* 4. Fixed Bottom Progress Key */}
      <div
        aria-label="Progress icon key"
        className="shrink-0 border-t border-border bg-background/80 px-3.5 py-3"
      >
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Progress Key
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <StatusIcon status="reviewed" className="size-3.5" />
            <span>Reviewed</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <StatusIcon status="in-progress" className="size-3.5" />
            <span>In progress</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <StatusIcon status="not-started" className="size-3.5" />
            <span>Not started</span>
          </span>
        </div>
      </div>
    </div>
  );

  const renderCompactSidebarBody = () => (
    <div className="flex h-full min-h-0 flex-col items-center">
      <div className="flex w-full shrink-0 flex-col items-center gap-1.5 border-b border-border py-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                aria-label="Back to Courses"
                render={<Link href="/app" />}
              />
            }
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="right">Back to Courses</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Expand sidebar"
                onClick={() => setSidebarMode("expanded")}
              />
            }
          >
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Hide sidebar"
                onClick={() => setSidebarMode("hidden")}
              />
            }
          >
            <EyeOff className="size-4" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="right">Hide sidebar</TooltipContent>
        </Tooltip>

        <span
          className="mt-1 font-mono text-[10px] font-semibold text-muted-foreground"
          title={`${reviewedCount} of ${totalPages} pages reviewed`}
        >
          {progressPercent}%
        </span>
      </div>

      <div className="flex w-full shrink-0 flex-col items-center gap-1 border-b border-border py-2.5">
        {dynamicSections.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.id;
          return (
            <Tooltip key={section.id}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={active ? "secondary" : "ghost"}
                    aria-label={section.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => handleSelectSection(section.id)}
                  />
                }
              >
                <Icon className="size-4" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="right">{section.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <nav
        aria-label="Course pages"
        className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-2.5"
      >
        {flatPages.map((page) => {
          const status = pageStatuses[page.id] ?? page.status;
          const isActive = activeSection === null && activePage?.id === page.id;
          return (
            <Tooltip key={page.id}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={isActive ? "secondary" : "ghost"}
                    aria-label={`${page.title} (${STATUS_LABELS[status]})`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => handleSelectPage(page.id)}
                  />
                }
              >
                <StatusIcon status={status} className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{page.title}</p>
                <p className="text-xs opacity-80">{STATUS_LABELS[status]}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="course-reader-shell flex min-h-0 flex-1 flex-col md:flex-row">
      {/* Mobile Course Navigation Trigger Bar */}
      <div className="no-print sticky top-[calc(4rem+var(--dev-bar-height))] z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-md md:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
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
            <span>Course Menu</span>
          </SheetTrigger>

          <SheetContent
            side="left"
            showCloseButton={false}
            className="h-dvh w-screen max-w-none! gap-0 border-0 p-0"
          >
            <SheetTitle className="sr-only">
              {course.title} course navigation
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigate course sections, pages, and review progress.
            </SheetDescription>
            {renderExpandedSidebarBody(true)}
          </SheetContent>
        </Sheet>

        <span className="truncate text-xs font-medium text-foreground">
          {course.title}
        </span>

        <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
          {progressPercent}%
        </Badge>
      </div>

      {/* Desktop Smart Sidebar */}
      {sidebarMode !== "hidden" && (
        <aside
          aria-label="Course sidebar"
          className={cn(
            "no-print sticky top-[calc(4rem+var(--dev-bar-height))] hidden h-[calc(100dvh-4rem-var(--dev-bar-height))] shrink-0 flex-col border-r border-border bg-surface/60 transition-[width] duration-200 md:flex",
            sidebarMode === "expanded" ? "w-80" : "w-16"
          )}
        >
          {sidebarMode === "expanded"
            ? renderExpandedSidebarBody(false)
            : renderCompactSidebarBody()}
        </aside>
      )}

      {/* Main Course Reading & Printable Area */}
      <main className="course-reader-main min-w-0 flex-1 px-4 py-6 pb-20 sm:px-8 lg:px-10">
        <div
          className="course-reading-measure mx-auto w-full"
          style={{ maxWidth: readingMeasure }}
        >
          {sidebarMode === "hidden" && (
            <div className="no-print mb-4 hidden flex-wrap items-center gap-2 md:flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSidebarMode("expanded")}
              >
                <PanelLeft className="size-4" aria-hidden="true" />
                <span>Show Sidebar</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSidebarMode("compact")}
              >
                <PanelLeftOpen className="size-4" aria-hidden="true" />
                <span>Icon Rail</span>
              </Button>
              <Link
                href="/app"
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span>Back to Courses</span>
              </Link>
            </div>
          )}

          {/* Print Preview / Print Controls */}
          <CoursePrintControls />

          {activeSection === "settings" &&
          (canManageSettings || canManageMembers) ? (
            /* Live Course Settings, Enrolled Members & Roles, and Delete Panel */
            <section className="space-y-6 rounded-xl border border-border bg-surface/40 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {canManageSettings
                        ? "Course Settings"
                        : "Course Members"}
                    </h1>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {courseArn}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {canManageSettings
                      ? "Manage course details, enrolled members & scoped roles, or delete this course."
                      : "Search enrolled learners and manage course-scoped roles."}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveSection(null)}
                >
                  Back to {activePage?.title ?? "Course"}
                </Button>
              </div>

              {canManageSettings && (
                <CourseSettingsForm
                  course={course}
                  onDeleted={() => router.push("/app")}
                />
              )}

              {canManageSettings && canManageMembers && <Separator />}

              {canManageMembers && <CourseMembersPanel course={course} />}
            </section>
          ) : activeSection ? (
            /* Lightweight stub panel for Glossary, Bookmarks, Notes, Suggestions, Analytics */
            <section className="space-y-4 rounded-xl border border-border bg-surface/40 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <Badge variant="outline" className="capitalize">
                    Course Tool · Stub
                  </Badge>
                  <h1 className="text-2xl font-semibold capitalize tracking-tight">
                    {activeSection}
                  </h1>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveSection(null)}
                >
                  Back to {activePage?.title ?? "Course"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Placeholder panel for the <strong>{activeSection}</strong> tool
                in <strong>{course.title}</strong>.
              </p>
            </section>
          ) : activePage ? (
            /* Printable Course Document — ONLY this remains in Print Preview & @media print */
            <article className="printable-course space-y-6">
              <header className="space-y-3 border-b border-border pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs uppercase text-muted-foreground">
                    {course.title}
                  </p>
                  <div className="no-print flex flex-wrap items-center gap-1.5">
                    {canEdit && !isEditingPage && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={handleStartEditPage}
                        aria-label={`Edit ${activePage.title}`}
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        <span>Edit page</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={cycleActivePageStatus}
                      className="gap-1.5"
                    >
                      <StatusIcon
                        status={activePageStatus}
                        className="size-3.5"
                      />
                      <span>Status: {STATUS_LABELS[activePageStatus]}</span>
                    </Button>
                  </div>
                </div>

                {isEditingPage && canEdit ? (
                  <form
                    onSubmit={handleSaveEditPage}
                    className="no-print space-y-3 rounded-xl border border-primary/30 bg-surface/50 p-4"
                  >
                    <div className="space-y-1">
                      <label
                        htmlFor="inline-page-title"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Page title
                      </label>
                      <Input
                        id="inline-page-title"
                        autoFocus
                        value={draftPageTitle}
                        onChange={(e) => setDraftPageTitle(e.target.value)}
                        className="h-9 bg-background text-base font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="inline-page-summary"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Intro summary
                      </label>
                      <textarea
                        id="inline-page-summary"
                        rows={2}
                        value={draftPageSummary}
                        onChange={(e) => setDraftPageSummary(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="inline-page-body"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Lesson content (separate paragraphs with a blank line)
                      </label>
                      <textarea
                        id="inline-page-body"
                        rows={7}
                        value={draftPageBody}
                        onChange={(e) => setDraftPageBody(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background p-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        size="xs"
                        disabled={!draftPageTitle.trim()}
                      >
                        <Check className="size-3" aria-hidden="true" />
                        <span>Save changes</span>
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => setIsEditingPage(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="group flex items-center gap-2">
                      <h1 className="text-3xl font-semibold tracking-tight">
                        {activePage.title}
                      </h1>
                      {canEdit && (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Edit ${activePage.title}`}
                          title="Edit page"
                          onClick={handleStartEditPage}
                          className="no-print text-muted-foreground opacity-60 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <BionicText text={activePageSummary} />
                    </p>
                  </>
                )}
              </header>

              {/* Dynamic Lesson Paragraphs */}
              <section className="space-y-4">
                {activeParagraphs.map((para, idx) => (
                  <p key={idx}>
                    <BionicText text={para} />
                  </p>
                ))}
              </section>

              {/* Calm inline page engagement footer (hidden in print) */}
              {canSuggest && (
                <footer className="no-print flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>Spot an error or have a note to share?</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="xs" variant="ghost">
                      <MessageSquare className="size-3.5" aria-hidden="true" />
                      <span>Comments (3)</span>
                    </Button>
                    <Button type="button" size="xs" variant="outline">
                      <GitPullRequest className="size-3.5" aria-hidden="true" />
                      <span>Raise Suggestion</span>
                    </Button>
                  </div>
                </footer>
              )}
            </article>
          ) : null}
        </div>
      </main>
    </div>
  );
}
