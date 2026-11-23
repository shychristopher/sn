"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import {
  ChevronDown,
  Lock,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import {
  COURSE_OWNER_RANK,
  SCOPED_ROLE_TEMPLATES,
  arn,
  canManageCourseTarget,
  getActorCourseRank,
  getAssignableCourseRoles,
  type ScopedRoleId,
} from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import type { CourseRecord } from "@/app/lib/courses-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MemberFilter = "all" | "staff" | "learners";

const COURSE_ROLE_LIST = Object.values(SCOPED_ROLE_TEMPLATES).sort(
  (a, b) => b.rank - a.rank
);

export function CourseMembersPanel({ course }: { course: CourseRecord }) {
  const {
    user: currentUser,
    users,
    roles,
    canSelfModify,
    setCourseRoleForUser,
  } = useAuth();

  const actorRank = getActorCourseRank(currentUser, course.id, roles);
  const assignableRoles = useMemo(
    () => getAssignableCourseRoles(currentUser, course.id, roles),
    [currentUser, course.id, roles]
  );
  const {
    getEnrolledUserIdsForCourse,
    enrollUserInCourse,
    removeUserFromCourse,
  } = useCourses();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [addUserId, setAddUserId] = useState<string>("");
  const [addRoleId, setAddRoleId] = useState<ScopedRoleId | "learner">(
    "learner"
  );

  const searchId = useId();
  const addUserSelectId = useId();
  const addRoleSelectId = useId();

  const enrolledIds = useMemo(
    () => new Set(getEnrolledUserIdsForCourse(course.id)),
    [getEnrolledUserIdsForCourse, course.id]
  );

  const enrolledUsers = useMemo(
    () =>
      users
        .filter((u) => enrolledIds.has(u.id))
        .map((u) => {
          const courseGrant = u.scopedRoles.find(
            (g) => g.resourceId === course.id
          );
          const roleId = courseGrant?.roleId ?? null;
          const roleName = roleId
            ? (SCOPED_ROLE_TEMPLATES[roleId]?.name ?? roleId)
            : "Learner";
          return { user: u, roleId, roleName };
        }),
    [users, enrolledIds, course.id]
  );

  const unenrolledUsers = useMemo(
    () => users.filter((u) => !enrolledIds.has(u.id)),
    [users, enrolledIds]
  );

  const staffCount = useMemo(
    () => enrolledUsers.filter((m) => m.roleId !== null).length,
    [enrolledUsers]
  );
  const learnerCount = enrolledUsers.length - staffCount;

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrolledUsers.filter(({ user: u, roleId, roleName }) => {
      if (filter === "staff" && roleId === null) return false;
      if (filter === "learners" && roleId !== null) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        roleName.toLowerCase().includes(q)
      );
    });
  }, [enrolledUsers, search, filter]);

  const effectiveAddUserId =
    addUserId && unenrolledUsers.some((u) => u.id === addUserId)
      ? addUserId
      : (unenrolledUsers[0]?.id ?? "");

  const handleEnrollUser = (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveAddUserId) return;
    enrollUserInCourse(course.id, effectiveAddUserId);
    if (addRoleId !== "learner") {
      setCourseRoleForUser(
        course.id,
        course.title,
        effectiveAddUserId,
        addRoleId
      );
    }
    setAddUserId("");
    setAddRoleId("learner");
  };

  const handleRemoveMember = (targetUserId: string) => {
    setCourseRoleForUser(course.id, course.title, targetUserId, null);
    removeUserFromCourse(course.id, targetUserId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            <Users className="size-4 text-primary" aria-hidden="true" />
            <span>Enrolled Members &amp; Course Roles</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {enrolledUsers.length}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground">
            Search enrolled learners and grant predefined roles scoped strictly
            to{" "}
            <code className="font-mono text-[11px]">
              {arn.course(course.id)}
            </code>
            .
          </p>
        </div>

        <Button
          type="button"
          size="xs"
          variant="ghost"
          aria-expanded={showRoleGuide}
          onClick={() => setShowRoleGuide((v) => !v)}
          className="gap-1 text-muted-foreground"
        >
          <Shield className="size-3" aria-hidden="true" />
          <span>Role permissions</span>
          <ChevronDown
            className={cn(
              "size-3 transition-transform",
              showRoleGuide && "rotate-180"
            )}
            aria-hidden="true"
          />
        </Button>
      </div>

      {/* Collapsible Predefined Course Roles Hierarchy Cheat-Sheet */}
      {showRoleGuide && (
        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
          <p className="text-[11px] text-muted-foreground">
            <strong className="font-semibold text-foreground">
              Hierarchy:
            </strong>{" "}
            Course Owner (100) › Maintainer (40) › Editor (30) › Teaching
            Assistant (20) › Suggestion Reviewer (10) › Learner (0). Only Owners
            can modify other Owners; lower managers can only edit or assign
            roles strictly below their own rank.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {COURSE_ROLE_LIST.map((tpl) => {
              const actions = tpl.buildStatements(course.id)[0]?.actions ?? [];
              return (
                <div
                  key={tpl.id}
                  className="space-y-1 rounded-lg border border-border bg-surface/40 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {tpl.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="h-4 px-1.5 font-mono text-[10px]"
                    >
                      Rank {tpl.rank}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {tpl.description}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {actions.map((act) => (
                      <code
                        key={act}
                        className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground"
                      >
                        {act}
                      </code>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-2.5">
        <div className="relative w-full max-w-xs">
          <label htmlFor={searchId} className="sr-only">
            Search enrolled members
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
            placeholder="Search name, email, or role…"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "all", label: `All (${enrolledUsers.length})` },
              { id: "staff", label: `With Role (${staffCount})` },
              { id: "learners", label: `Learners (${learnerCount})` },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="xs"
              variant={filter === tab.id ? "default" : "ghost"}
              aria-pressed={filter === tab.id}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Enrolled Users List */}
      {filteredMembers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No enrolled users match your search.
        </p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {filteredMembers.map(({ user: member, roleId, roleName }) => {
            const isSelf = currentUser?.id === member.id;
            const canManageThisRow = canManageCourseTarget(
              currentUser,
              course.id,
              member,
              roles
            );
            const roleLocked = !canManageThisRow;
            const lockReason =
              isSelf && !canSelfModify
                ? `Self-modification requires explicit user:self:modify on ${arn.selfModify()}`
                : actorRank < COURSE_OWNER_RANK
                  ? `You can only modify members ranked below your course role (Rank ${actorRank}).`
                  : "Insufficient privileges to edit this member.";

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar size="sm">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {member.name}
                      </span>
                      {isSelf && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          You
                        </Badge>
                      )}
                      {member.suspended && (
                        <Badge
                          variant="destructive"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          Suspended
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {member.email} ·{" "}
                      <code className="font-mono text-[10px]">{member.id}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {roleLocked && (
                      <Lock
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <label
                      htmlFor={`course-role-${member.id}`}
                      className="sr-only"
                    >
                      Course role for {member.name}
                    </label>
                    <select
                      id={`course-role-${member.id}`}
                      value={roleId ?? "learner"}
                      disabled={roleLocked}
                      title={
                        roleLocked
                          ? lockReason
                          : `Assign course role to ${member.name}`
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setCourseRoleForUser(
                          course.id,
                          course.title,
                          member.id,
                          val === "learner" ? null : (val as ScopedRoleId)
                        );
                      }}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="learner">Learner (Read-only)</option>
                      {roleLocked && roleId ? (
                        <option value={roleId}>{roleName}</option>
                      ) : (
                        assignableRoles.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {!isSelf && canManageThisRow && (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Remove ${member.name} from course`}
                      title="Remove from course"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <UserMinus
                        className="size-3.5 text-muted-foreground hover:text-destructive"
                        aria-hidden="true"
                      />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enroll Another Directory User */}
      {unenrolledUsers.length > 0 && (
        <form
          onSubmit={handleEnrollUser}
          className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-12 sm:items-end"
        >
          <div className="space-y-1 sm:col-span-5">
            <label
              htmlFor={addUserSelectId}
              className="block text-xs font-medium text-foreground"
            >
              Add user to course
            </label>
            <select
              id={addUserSelectId}
              value={effectiveAddUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {unenrolledUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 sm:col-span-4">
            <label
              htmlFor={addRoleSelectId}
              className="block text-xs font-medium text-foreground"
            >
              Course role
            </label>
            <select
              id={addRoleSelectId}
              value={addRoleId}
              onChange={(e) =>
                setAddRoleId(e.target.value as ScopedRoleId | "learner")
              }
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="learner">Learner (Read-only)</option>
              {assignableRoles.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <Button type="submit" size="sm" className="h-8 w-full">
              <UserPlus className="size-3.5" aria-hidden="true" />
              <span>Enroll</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
