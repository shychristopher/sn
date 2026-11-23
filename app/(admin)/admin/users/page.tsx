"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  KeyRound,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldBan,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import {
  ALL_IAM_ACTIONS,
  SCOPED_ROLE_TEMPLATES,
  arn,
  hasAnyAdminAccess,
  roleGrantsSelfModify,
  statementGrantsSelfModify,
  type GlobalRoleId,
  type IamAction,
  type PolicyEffect,
  type ResourceArn,
  type ScopedRoleId,
} from "@/app/lib/iam";
import { useCourses } from "@/app/lib/courses-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type UserFilter = "all" | "active" | "suspended" | "admin";

export default function AdminUsersPage() {
  const {
    user: currentUser,
    users,
    roles,
    hasCustomUsers,
    canEditUser,
    canSelfModify,
    selectUser,
    createUser,
    deleteUser,
    toggleUserGlobalRole,
    addUserScopedRole,
    removeUserScopedRole,
    addUserInlinePolicy,
    removeUserInlinePolicy,
    setUserSuspended,
    resetUsers,
  } = useAuth();
  const { courses } = useCourses();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users[0]?.id ?? "usr_alex_01"
  );

  // Create User form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newInitialRoles, setNewInitialRoles] = useState<GlobalRoleId[]>([
    "role_member",
  ]);

  // Scoped course grant form state
  const [grantRoleId, setGrantRoleId] = useState<ScopedRoleId>("course_owner");
  const [grantCourseId, setGrantCourseId] = useState<string>(
    courses[0]?.id ?? "crs_web_a11y"
  );

  // Inline policy override form state
  const [inlineEffect, setInlineEffect] = useState<PolicyEffect>("Allow");
  const [inlineAction, setInlineAction] = useState<IamAction>("tag:apply");
  const [inlineResource, setInlineResource] = useState<string>(
    arn.tag("tag_curated_recommended")
  );
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Suspend reason input
  const [suspendReason, setSuspendReason] = useState("");

  const searchId = useId();
  const nameId = useId();
  const emailId = useId();
  const scopedRoleSelectId = useId();
  const scopedCourseSelectId = useId();
  const inlineActionId = useId();
  const inlineResourceId = useId();
  const suspendReasonId = useId();

  const roleList = useMemo(() => Object.values(roles), [roles]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "active" && u.suspended) return false;
      if (filter === "suspended" && !u.suspended) return false;
      if (filter === "admin" && !hasAnyAdminAccess(u, roles)) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.roleSummary.toLowerCase().includes(q)
      );
    });
  }, [users, search, filter, roles]);

  const selectedUser =
    users.find((u) => u.id === selectedUserId) ?? users[0] ?? null;
  const isEditingSelf = Boolean(
    selectedUser && currentUser && selectedUser.id === currentUser.id
  );
  const canEditSelectedUser = selectedUser
    ? canEditUser(selectedUser.id)
    : false;
  const selfModifyLocked = isEditingSelf && !canEditSelectedUser;

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = createUser({
      name: newName,
      email: newEmail,
      globalRoles: newInitialRoles,
    });
    setSelectedUserId(created.id);
    setNewName("");
    setNewEmail("");
    setNewInitialRoles(["role_member"]);
    setShowCreateForm(false);
  };

  const handlePreviewAsUser = (userId: string, suspended: boolean) => {
    selectUser(userId);
    if (suspended) {
      router.push("/suspended");
    } else {
      router.push("/app");
    }
  };

  const handleAddScopedGrant = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const targetId = courses.some((c) => c.id === grantCourseId)
      ? grantCourseId
      : (courses[0]?.id ?? grantCourseId);
    const course = courses.find((c) => c.id === targetId);
    addUserScopedRole(selectedUser.id, {
      roleId: grantRoleId,
      resourceId: targetId,
      resourceLabel: course?.title ?? targetId,
    });
  };

  const handleAddInlineOverride = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const trimmed = inlineResource.trim();
    if (!trimmed.startsWith("sn:") || trimmed.length < 4) {
      setInlineError('ARN must start with "sn:" (e.g. sn:course:*).');
      return;
    }
    const candidate = {
      sid: `UserInline_${inlineEffect}_${Date.now().toString(36).slice(-4)}`,
      effect: inlineEffect,
      actions: [inlineAction],
      resources: [trimmed as ResourceArn],
    };
    if (statementGrantsSelfModify(candidate) && !canSelfModify) {
      setInlineError(
        `Delegation blocked: you cannot grant user:self:modify on ${arn.selfModify()} unless you already hold it yourself.`
      );
      return;
    }
    setInlineError(null);
    addUserInlinePolicy(selectedUser.id, candidate);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {users.length}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create users, assign or revoke global roles and scoped course ARNs,
            then click the user in the top preview bar (or{" "}
            <strong className="font-medium text-foreground">Preview as</strong>)
            to see Shy Notes through their exact permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasCustomUsers && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetUsers}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Reset default users</span>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreateForm((v) => !v)}
          >
            <UserPlus className="size-3.5" aria-hidden="true" />
            <span>New User</span>
          </Button>
        </div>
      </div>

      {/* Inline Create User Card */}
      {showCreateForm && (
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create Directory User</CardTitle>
            <CardDescription className="text-xs">
              Stored in{" "}
              <code className="font-mono">localStorage</code> and added
              immediately to the top preview bar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor={nameId}
                    className="block text-xs font-medium text-foreground"
                  >
                    Full name
                  </label>
                  <Input
                    id={nameId}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Taylor Kim"
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={emailId}
                    className="block text-xs font-medium text-foreground"
                  >
                    Email (optional)
                  </label>
                  <Input
                    id={emailId}
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="taylor@shynotes.org"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-foreground">
                  Initial global roles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {roleList.map((role) => {
                    const checked = newInitialRoles.includes(role.id);
                    return (
                      <Button
                        key={role.id}
                        type="button"
                        size="xs"
                        variant={checked ? "default" : "outline"}
                        aria-pressed={checked}
                        onClick={() =>
                          setNewInitialRoles((prev) =>
                            prev.includes(role.id)
                              ? prev.filter((r) => r !== role.id)
                              : [...prev, role.id]
                          )
                        }
                      >
                        {checked && (
                          <Check className="size-3" aria-hidden="true" />
                        )}
                        <span>{role.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={!newName.trim()}>
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Create User</span>
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

      {/* Main 2-Column Directory + User IAM Editor */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Searchable Directory */}
        <div className="space-y-3 lg:col-span-4">
          <div className="space-y-2 rounded-xl border border-border bg-surface/50 p-3">
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Search users
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
                placeholder="Search name, email, or ID…"
                className="h-8 bg-background pl-8 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "admin", label: "Admin" },
                  { id: "suspended", label: "Suspended" },
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

          <div className="space-y-1.5">
            {filteredUsers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No users match your current filter.
              </p>
            ) : (
              filteredUsers.map((u) => {
                const selected = selectedUser?.id === u.id;
                const isSelf = currentUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedUserId(u.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected
                        ? "border-primary bg-accent ring-1 ring-primary"
                        : "border-border bg-background hover:bg-surface/70"
                    )}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={u.avatarUrl} alt={u.name} />
                      <AvatarFallback>{u.initials}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {u.name}
                        </span>
                        {isSelf && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px]"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {u.email}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge
                          variant={u.suspended ? "destructive" : "secondary"}
                          className="h-4 px-1.5 text-[10px]"
                        >
                          {u.roleSummary}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected User IAM Editor */}
        <div className="lg:col-span-8">
          {selectedUser && (
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarImage
                        src={selectedUser.avatarUrl}
                        alt={selectedUser.name}
                      />
                      <AvatarFallback>{selectedUser.initials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">
                          {selectedUser.name}
                        </CardTitle>
                        <Badge
                          variant={
                            selectedUser.suspended ? "destructive" : "secondary"
                          }
                        >
                          {selectedUser.roleSummary}
                        </Badge>
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                        <span>{selectedUser.email}</span>
                        <span>·</span>
                        <code className="font-mono text-[11px]">
                          {selectedUser.id}
                        </code>
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={() =>
                        handlePreviewAsUser(
                          selectedUser.id,
                          selectedUser.suspended
                        )
                      }
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                      <span>
                        Preview as {selectedUser.name.split(" ")[0]}
                      </span>
                    </Button>
                    {!selectedUser.system && canEditSelectedUser && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${selectedUser.name}`}
                        onClick={() => {
                          deleteUser(selectedUser.id);
                          setSelectedUserId(users[0]?.id ?? "usr_sam_04");
                        }}
                      >
                        <Trash2
                          className="size-4 text-destructive"
                          aria-hidden="true"
                        />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-5">
                {selfModifyLocked && (
                  <div
                    role="status"
                    className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-foreground"
                  >
                    <Lock
                      className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        Self-modification protected
                      </p>
                      <p className="text-muted-foreground">
                        You cannot modify your own account, roles, or
                        privileges—even with wildcard{" "}
                        <code className="font-mono text-foreground">*</code>{" "}
                        permissions—unless explicitly granted{" "}
                        <code className="font-mono text-foreground">
                          Allow user:self:modify
                        </code>{" "}
                        on{" "}
                        <code className="font-mono text-foreground">
                          {arn.selfModify()}
                        </code>
                        .
                      </p>
                    </div>
                  </div>
                )}

                {isEditingSelf && canSelfModify && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-foreground"
                  >
                    <ShieldCheck
                      className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span>
                      Explicit break-glass grant active (
                      <code className="font-mono">
                        user:self:modify @ {arn.selfModify()}
                      </code>
                      ) — self-editing unlocked.
                    </span>
                  </div>
                )}

                {/* 1. Global Roles Toggle Grid */}
                <div className="space-y-2.5">
                  <div>
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Shield className="size-4 text-primary" aria-hidden="true" />
                      <span>Global Roles</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Click any role to attach or revoke it immediately. Custom
                      roles created in Roles &amp; Privileges appear here
                      automatically.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {roleList.map((role) => {
                      const assigned = selectedUser.globalRoles.includes(
                        role.id
                      );
                      const delegationBlocked =
                        !assigned &&
                        roleGrantsSelfModify(role) &&
                        !canSelfModify;

                      return (
                        <button
                          key={role.id}
                          type="button"
                          disabled={!canEditSelectedUser || delegationBlocked}
                          title={
                            delegationBlocked
                              ? "Cannot assign a role containing user:self:modify unless you hold it yourself"
                              : undefined
                          }
                          aria-pressed={assigned}
                          onClick={() =>
                            toggleUserGlobalRole(selectedUser.id, role.id)
                          }
                          className={cn(
                            "flex items-start justify-between gap-2 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                            assigned
                              ? "border-primary bg-accent ring-1 ring-primary"
                              : "border-border bg-background hover:bg-surface/70"
                          )}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                {role.name}
                              </span>
                              <code className="font-mono text-[10px] text-muted-foreground">
                                {role.id}
                              </code>
                            </div>
                            <p className="line-clamp-2 text-[11px] text-muted-foreground">
                              {role.description}
                            </p>
                          </div>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                              assigned
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background"
                            )}
                          >
                            {assigned && <Check className="size-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* 2. Scoped Course Grants (by Immutable Course ID) */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Scoped Course Grants
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Attach course-level owner or maintainer privileges to
                      specific immutable course IDs.
                    </p>
                  </div>

                  {selectedUser.scopedRoles.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                      No course-specific grants attached.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.scopedRoles.map((grant) => (
                        <span
                          key={`${grant.roleId}-${grant.resourceId}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-xs"
                        >
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {SCOPED_ROLE_TEMPLATES[grant.roleId]?.name ??
                              grant.roleId}
                          </Badge>
                          <span className="font-medium text-foreground">
                            {grant.resourceLabel ?? grant.resourceId}
                          </span>
                          <code className="font-mono text-[10px] text-muted-foreground">
                            sn:course:{grant.resourceId}
                          </code>
                          {canEditSelectedUser && (
                            <button
                              type="button"
                              aria-label={`Revoke ${grant.roleId} on ${grant.resourceId}`}
                              onClick={() =>
                                removeUserScopedRole(
                                  selectedUser.id,
                                  grant.roleId,
                                  grant.resourceId
                                )
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {canEditSelectedUser && (
                    <form
                      onSubmit={handleAddScopedGrant}
                      className="grid gap-2 rounded-xl border border-border bg-surface/40 p-3 sm:grid-cols-12 sm:items-end"
                    >
                    <div className="space-y-1 sm:col-span-4">
                      <label
                        htmlFor={scopedRoleSelectId}
                        className="block text-xs font-medium text-foreground"
                      >
                        Scoped template
                      </label>
                      <select
                        id={scopedRoleSelectId}
                        value={grantRoleId}
                        onChange={(e) =>
                          setGrantRoleId(e.target.value as ScopedRoleId)
                        }
                        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {Object.values(SCOPED_ROLE_TEMPLATES).map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-6">
                      <label
                        htmlFor={scopedCourseSelectId}
                        className="block text-xs font-medium text-foreground"
                      >
                        Course (immutable ID)
                      </label>
                      <select
                        id={scopedCourseSelectId}
                        value={grantCourseId}
                        onChange={(e) => setGrantCourseId(e.target.value)}
                        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <Button type="submit" size="sm" className="w-full">
                        Grant
                      </Button>
                    </div>
                  </form>
                  )}
                </div>

                <Separator />

                {/* 3. Direct Inline Policy Overrides */}
                <div className="space-y-3">
                  <div>
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <KeyRound
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      <span>Direct Inline Policy Overrides</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Grant a one-off ARN (like{" "}
                      <code className="font-mono">
                        sn:tag:tag_curated_recommended
                      </code>{" "}
                      or{" "}
                      <code className="font-mono">{arn.selfModify()}</code>) or
                      apply an explicit <code className="font-mono">Deny</code>{" "}
                      that overrides every attached role.
                    </p>
                  </div>

                  {(selectedUser.inlinePolicies?.length ?? 0) > 0 && (
                    <div className="space-y-1.5">
                      {selectedUser.inlinePolicies?.map((st, idx) => (
                        <div
                          key={`${st.sid ?? "inline"}-${idx}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                st.effect === "Deny" ? "destructive" : "default"
                              }
                              className="h-4 px-1.5 text-[10px]"
                            >
                              {st.effect}
                            </Badge>
                            <code className="font-mono text-foreground">
                              {st.actions.join(", ")}
                            </code>
                            <span className="text-muted-foreground">on</span>
                            <code className="font-mono text-foreground">
                              {st.resources.join(", ")}
                            </code>
                          </div>
                          {canEditSelectedUser &&
                            st.sid !== "AccountSuspendedDenyAll" && (
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="ghost"
                                aria-label="Remove inline policy"
                                onClick={() =>
                                  removeUserInlinePolicy(selectedUser.id, idx)
                                }
                              >
                                <Trash2
                                  className="size-3.5 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </Button>
                            )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canEditSelectedUser && (
                    <form
                      onSubmit={handleAddInlineOverride}
                      className="grid gap-2 rounded-xl border border-border bg-surface/40 p-3 sm:grid-cols-12 sm:items-end"
                    >
                    <div className="space-y-1 sm:col-span-3">
                      <span className="block text-xs font-medium text-foreground">
                        Effect
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {(["Allow", "Deny"] as const).map((eff) => (
                          <Button
                            key={eff}
                            type="button"
                            size="sm"
                            variant={
                              inlineEffect === eff
                                ? eff === "Deny"
                                  ? "destructive"
                                  : "default"
                                : "outline"
                            }
                            onClick={() => setInlineEffect(eff)}
                          >
                            {eff}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-4">
                      <label
                        htmlFor={inlineActionId}
                        className="block text-xs font-medium text-foreground"
                      >
                        Action
                      </label>
                      <select
                        id={inlineActionId}
                        value={inlineAction}
                        onChange={(e) =>
                          setInlineAction(e.target.value as IamAction)
                        }
                        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 font-mono text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {ALL_IAM_ACTIONS.map((act) => (
                          <option key={act} value={act}>
                            {act}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-3">
                      <label
                        htmlFor={inlineResourceId}
                        className="block text-xs font-medium text-foreground"
                      >
                        Resource ARN
                      </label>
                      <Input
                        id={inlineResourceId}
                        value={inlineResource}
                        onChange={(e) => setInlineResource(e.target.value)}
                        className="h-9 font-mono text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Button type="submit" size="sm" className="w-full">
                        Add
                      </Button>
                    </div>

                    {inlineError && (
                      <p
                        role="alert"
                        className="text-xs text-destructive sm:col-span-12"
                      >
                        {inlineError}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 sm:col-span-12">
                      <span className="text-[11px] text-muted-foreground">
                        Quick grant:
                      </span>
                      {canSelfModify && (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineEffect("Allow");
                            setInlineAction("user:self:modify");
                            setInlineResource(arn.selfModify());
                          }}
                          className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                        >
                          Allow Self-Modify ({arn.selfModify()})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setInlineEffect("Allow");
                          setInlineAction("tag:apply");
                          setInlineResource(arn.tag("tag_curated_recommended"));
                        }}
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        Allow Recommended Tag
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineEffect("Deny");
                          setInlineAction("course:create");
                          setInlineResource(arn.course("*"));
                        }}
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        Deny Course Creation
                      </button>
                    </div>
                  </form>
                  )}
                </div>

                <Separator />

                {/* 4. Account Suspension Controls */}
                <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        {selectedUser.suspended ? (
                          <ShieldBan
                            className="size-4 text-destructive"
                            aria-hidden="true"
                          />
                        ) : (
                          <ShieldCheck
                            className="size-4 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          Account Status:{" "}
                          {selectedUser.suspended ? "Suspended" : "Active"}
                        </span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Suspending attaches an explicit{" "}
                        <code className="font-mono">Deny * on sn:*</code> and
                        locks the user onto{" "}
                        <code className="font-mono">/suspended</code>.
                      </p>
                    </div>

                    {selectedUser.suspended ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canEditSelectedUser}
                        onClick={() => setUserSuspended(selectedUser.id, false)}
                      >
                        Reinstate Account
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={!canEditSelectedUser}
                        title={
                          selfModifyLocked
                            ? `Requires explicit user:self:modify on ${arn.selfModify()}`
                            : "Suspend user account"
                        }
                        onClick={() => {
                          setUserSuspended(selectedUser.id, true, suspendReason);
                          setSuspendReason("");
                        }}
                      >
                        Suspend Account
                      </Button>
                    )}
                  </div>

                  {!selectedUser.suspended && canEditSelectedUser && (
                      <div className="space-y-1">
                        <label
                          htmlFor={suspendReasonId}
                          className="block text-[11px] font-medium text-muted-foreground"
                        >
                          Optional suspension reason
                        </label>
                        <Input
                          id={suspendReasonId}
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                          placeholder="Reason shown on the /suspended appeal screen…"
                          className="h-8 bg-background text-xs"
                        />
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
