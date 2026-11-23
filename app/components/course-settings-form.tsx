"use client";

import { useState, type FormEvent } from "react";
import { Award, Check, Lock, Sparkles, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface CourseSettingsFormProps {
  course: CourseRecord;
  /** Shows catalog tier + protected editorial tag controls (used in Admin Course Profile) */
  showAdminControls?: boolean;
  onDeleted?: () => void;
}

export function CourseSettingsForm({
  course,
  showAdminControls = false,
  onDeleted,
}: CourseSettingsFormProps) {
  const { can } = useAuth();
  const { updateCourse, deleteCourse, toggleCuratedTag } = useCourses();

  const courseArn = arn.course(course.id);
  const canEdit =
    can("course:settings:manage", courseArn) || can("course:edit", courseArn);
  const canDelete = can("course:delete", courseArn);
  const canApplyRecommended = can(
    "tag:apply",
    arn.tag("tag_curated_recommended")
  );
  const canApplyStaffPick = can("tag:apply", arn.tag("tag_curated_staff_pick"));

  const [title, setTitle] = useState(course.title);
  const [summary, setSummary] = useState(course.summary);
  const [tier, setTier] = useState<CourseTier>(course.tier);
  const [inviteCode, setInviteCode] = useState(course.inviteCode ?? "");
  const [tags, setTags] = useState<string[]>(course.tags);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasRecommended = course.curatedTagIds.includes(
    "tag_curated_recommended"
  );
  const hasStaffPick = course.curatedTagIds.includes("tag_curated_staff_pick");

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !canEdit) return;
    updateCourse(course.id, {
      title: title.trim(),
      summary: summary.trim(),
      inviteCode: inviteCode.trim().toUpperCase() || undefined,
      tags: tags.length > 0 ? tags : ["Accessibility"],
      ...(showAdminControls ? { tier } : {}),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleDelete = () => {
    deleteCourse(course.id);
    onDeleted?.();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              General Course Settings
            </h2>
            <p className="text-xs text-muted-foreground">
              Metadata, invite access, and discovery tags for{" "}
              <code className="font-mono text-[11px]">{courseArn}</code>.
            </p>
          </div>
          {!canEdit && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Lock className="size-2.5" aria-hidden="true" />
              Read-only
            </Badge>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-12">
          <div
            className={
              showAdminControls ? "space-y-1 sm:col-span-6" : "space-y-1 sm:col-span-8"
            }
          >
            <label
              htmlFor={`course-title-${course.id}`}
              className="block text-xs font-medium text-foreground"
            >
              Course title
            </label>
            <Input
              id={`course-title-${course.id}`}
              value={title}
              disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 bg-background"
              required
            />
          </div>

          {showAdminControls && (
            <div className="space-y-1 sm:col-span-3">
              <label
                htmlFor={`course-tier-${course.id}`}
                className="block text-xs font-medium text-foreground"
              >
                Catalog tier
              </label>
              <select
                id={`course-tier-${course.id}`}
                value={tier}
                disabled={!canEdit}
                onChange={(e) => setTier(e.target.value as CourseTier)}
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
              >
                <option value="featured">Featured</option>
                <option value="popular">Popular</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div
            className={
              showAdminControls ? "space-y-1 sm:col-span-3" : "space-y-1 sm:col-span-4"
            }
          >
            <label
              htmlFor={`course-invite-${course.id}`}
              className="block text-xs font-medium text-foreground"
            >
              Invite code
            </label>
            <Input
              id={`course-invite-${course.id}`}
              value={inviteCode}
              disabled={!canEdit}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. SHY-101"
              className="h-9 bg-background font-mono uppercase"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`course-summary-${course.id}`}
            className="block text-xs font-medium text-foreground"
          >
            Summary
          </label>
          <textarea
            id={`course-summary-${course.id}`}
            rows={3}
            value={summary}
            disabled={!canEdit}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-foreground">
            Topic tags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STANDARD_TOPIC_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <Button
                  key={tag}
                  type="button"
                  size="xs"
                  disabled={!canEdit}
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() =>
                    setTags((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    )
                  }
                >
                  {active && <Check className="size-3" aria-hidden="true" />}
                  <span>{tag}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {canEdit && (
          <div>
            <Button type="submit" size="sm" disabled={!title.trim()}>
              {savedNotice ? (
                <>
                  <Check className="size-3.5" aria-hidden="true" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save Course Settings</span>
              )}
            </Button>
          </div>
        )}
      </form>

      {showAdminControls && (
        <>
          <Separator />
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Protected Editorial Tags
              </h2>
              <p className="text-xs text-muted-foreground">
                Controlled by explicit{" "}
                <code className="font-mono text-[11px]">tag:apply</code> grants
                on{" "}
                <code className="font-mono text-[11px]">
                  sn:tag:tag_curated_*
                </code>
                .
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Award
                      className="size-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span>Recommended</span>
                  </div>
                  <code className="font-mono text-[10px] text-muted-foreground">
                    sn:tag:tag_curated_recommended
                  </code>
                </div>
                <Button
                  type="button"
                  size="xs"
                  disabled={!canApplyRecommended}
                  variant={hasRecommended ? "default" : "outline"}
                  aria-pressed={hasRecommended}
                  onClick={() =>
                    toggleCuratedTag(course.id, "tag_curated_recommended")
                  }
                >
                  {hasRecommended ? "Applied" : "Apply"}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles
                      className="size-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span>Staff Pick</span>
                  </div>
                  <code className="font-mono text-[10px] text-muted-foreground">
                    sn:tag:tag_curated_staff_pick
                  </code>
                </div>
                <Button
                  type="button"
                  size="xs"
                  disabled={!canApplyStaffPick}
                  variant={hasStaffPick ? "default" : "outline"}
                  aria-pressed={hasStaffPick}
                  onClick={() =>
                    toggleCuratedTag(course.id, "tag_curated_staff_pick")
                  }
                >
                  {hasStaffPick ? "Applied" : "Apply"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {canDelete && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/35 bg-destructive/5 p-4">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-destructive">
                Danger Zone
              </h2>
              <p className="text-xs text-muted-foreground">
                Permanently deletes{" "}
                <code className="font-mono">{course.id}</code>, all modules &amp;
                pages, and scoped grants.
              </p>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  <span>Confirm delete</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                <span>Delete Course</span>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
