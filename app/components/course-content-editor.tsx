"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, FileText, Lock, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { arn } from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import {
  DEFAULT_PAGE_BODY,
  DEFAULT_PAGE_SUMMARY,
  flattenCoursePages,
  type CoursePageNode,
  type CourseRecord,
} from "@/app/lib/courses-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Full in-place Course Syllabus & Lesson Content Editor used inside the Admin Course Profile
 * so admins can edit modules, pages, subpages, and lesson copy without leaving /admin.
 */
export function CourseContentEditor({ course }: { course: CourseRecord }) {
  const { can } = useAuth();
  const { addModule, deleteModule, addPage, updatePage, deletePage } =
    useCourses();

  const canEdit = can("course:edit", arn.course(course.id));
  const flatPages = useMemo(
    () => flattenCoursePages(course.modules),
    [course.modules]
  );

  const [selectedPageId, setSelectedPageId] = useState<string>(
    flatPages[0]?.id ?? ""
  );
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingPageModuleId, setAddingPageModuleId] = useState<string | null>(
    null
  );
  const [newPageTitle, setNewPageTitle] = useState("");
  const [addingSubpageId, setAddingSubpageId] = useState<string | null>(null);
  const [newSubpageTitle, setNewSubpageTitle] = useState("");

  const activePage: CoursePageNode | undefined =
    flatPages.find((p) => p.id === selectedPageId) ?? flatPages[0];

  const handleCreateModule = (e: FormEvent) => {
    e.preventDefault();
    const res = addModule(course.id, newModuleTitle);
    if (!res) return;
    setNewModuleTitle("");
    setAddingModule(false);
    setSelectedPageId(res.firstPageId);
  };

  const handleCreatePage = (e: FormEvent, moduleId: string) => {
    e.preventDefault();
    const newId = addPage(course.id, moduleId, newPageTitle);
    if (!newId) return;
    setNewPageTitle("");
    setAddingPageModuleId(null);
    setSelectedPageId(newId);
  };

  const handleCreateSubpage = (
    e: FormEvent,
    moduleId: string,
    parentId: string
  ) => {
    e.preventDefault();
    const newId = addPage(course.id, moduleId, newSubpageTitle, parentId);
    if (!newId) return;
    setNewSubpageTitle("");
    setAddingSubpageId(null);
    setSelectedPageId(newId);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Left: Interactive Syllabus Tree */}
      <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-3.5 lg:col-span-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Syllabus ({flatPages.length}{" "}
            {flatPages.length === 1 ? "page" : "pages"})
          </span>
          {canEdit && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setAddingModule((v) => !v)}
            >
              <Plus className="size-3" aria-hidden="true" />
              <span>Module</span>
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {course.modules.map((mod) => (
            <div key={mod.id} className="space-y-1">
              <div className="group flex items-center justify-between gap-1 px-1">
                <span className="truncate text-xs font-semibold text-foreground">
                  {mod.title}
                </span>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`Add page to ${mod.title}`}
                      title="Add page"
                      onClick={() => {
                        setAddingPageModuleId((p) =>
                          p === mod.id ? null : mod.id
                        );
                        setNewPageTitle("");
                      }}
                      className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  const selected = activePage?.id === page.id;
                  return (
                    <li key={page.id} className="space-y-0.5">
                      <div className="group flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPageId(page.id)}
                          aria-current={selected ? "page" : undefined}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            selected
                              ? "bg-background font-semibold text-foreground shadow-2xs ring-1 ring-border"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          )}
                        >
                          <FileText
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">{page.title}</span>
                        </button>
                        {canEdit && (
                          <div className="flex shrink-0 items-center">
                            <button
                              type="button"
                              aria-label={`Add subpage under ${page.title}`}
                              title="Add subpage"
                              onClick={() => {
                                setAddingSubpageId((p) =>
                                  p === page.id ? null : page.id
                                );
                                setNewSubpageTitle("");
                              }}
                              className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                            >
                              <Plus className="size-3" aria-hidden="true" />
                            </button>
                            {flatPages.length > 1 && (
                              <button
                                type="button"
                                aria-label={`Delete ${page.title}`}
                                title="Delete page"
                                onClick={() => deletePage(course.id, page.id)}
                                className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-muted hover:text-destructive group-hover:opacity-100"
                              >
                                <Trash2 className="size-3" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {((page.subpages && page.subpages.length > 0) ||
                        addingSubpageId === page.id) && (
                        <ul className="ml-4 space-y-0.5 border-l border-border pl-2">
                          {page.subpages?.map((sub) => {
                            const subSelected = activePage?.id === sub.id;
                            return (
                              <li
                                key={sub.id}
                                className="group flex items-center gap-0.5"
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedPageId(sub.id)}
                                  aria-current={
                                    subSelected ? "page" : undefined
                                  }
                                  className={cn(
                                    "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors",
                                    subSelected
                                      ? "bg-background font-semibold text-foreground shadow-2xs ring-1 ring-border"
                                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                  )}
                                >
                                  <span className="truncate">{sub.title}</span>
                                </button>
                                {canEdit && flatPages.length > 1 && (
                                  <button
                                    type="button"
                                    aria-label={`Delete ${sub.title}`}
                                    onClick={() =>
                                      deletePage(course.id, sub.id)
                                    }
                                    className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-muted hover:text-destructive group-hover:opacity-100"
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

                          {canEdit && addingSubpageId === page.id && (
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
                                  aria-label="Cancel"
                                  onClick={() => setAddingSubpageId(null)}
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

                {canEdit && addingPageModuleId === mod.id && (
                  <li className="pt-1">
                    <form
                      onSubmit={(e) => handleCreatePage(e, mod.id)}
                      className="flex items-center gap-1"
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
                        aria-label="Cancel"
                        onClick={() => setAddingPageModuleId(null)}
                      >
                        <X className="size-3" aria-hidden="true" />
                      </Button>
                    </form>
                  </li>
                )}
              </ul>
            </div>
          ))}

          {canEdit && addingModule && (
            <form
              onSubmit={handleCreateModule}
              className="flex items-center gap-1 pt-1"
            >
              <Input
                autoFocus
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="New module title…"
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
                aria-label="Cancel"
                onClick={() => setAddingModule(false)}
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Right: In-Place Page Content Editor */}
      <div className="lg:col-span-7">
        {activePage ? (
          <PageDraftForm
            key={activePage.id}
            page={activePage}
            canEdit={canEdit}
            onSave={(patch) => updatePage(course.id, activePage.id, patch)}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Select a page from the syllabus to inspect or edit its content.
          </p>
        )}
      </div>
    </div>
  );
}

function PageDraftForm({
  page,
  canEdit,
  onSave,
}: {
  page: CoursePageNode;
  canEdit: boolean;
  onSave: (patch: { title: string; summary: string; body: string }) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [summary, setSummary] = useState(page.summary ?? DEFAULT_PAGE_SUMMARY);
  const [body, setBody] = useState(page.body ?? DEFAULT_PAGE_BODY);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !canEdit) return;
    onSave({
      title: title.trim(),
      summary: summary.trim() || DEFAULT_PAGE_SUMMARY,
      body: body.trim() || DEFAULT_PAGE_BODY,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-border bg-background p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">
            Page Editor
          </h3>
          <code className="font-mono text-[11px] text-muted-foreground">
            {page.id}
          </code>
        </div>
        {!canEdit && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Lock className="size-2.5" aria-hidden="true" />
            Read-only
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-foreground">
          Page title
        </label>
        <Input
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 text-sm font-medium"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-foreground">
          Intro summary
        </label>
        <textarea
          rows={2}
          value={summary}
          disabled={!canEdit}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-foreground">
          Lesson content (separate paragraphs with a blank line)
        </label>
        <textarea
          rows={9}
          value={body}
          disabled={!canEdit}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border border-input bg-background p-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        />
      </div>

      {canEdit && (
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={!title.trim()}>
            {saved ? (
              <>
                <Check className="size-3.5" aria-hidden="true" />
                <span>Saved page</span>
              </>
            ) : (
              <span>Save Page</span>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
