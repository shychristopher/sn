"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FlaskConical,
  KeyRound,
  Lock,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldBan,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import {
  ALL_IAM_ACTIONS,
  SCOPED_ROLE_TEMPLATES,
  arn,
  evaluatePolicy,
  statementGrantsSelfModify,
  type IamAction,
  type PolicyEffect,
  type ResourceArn,
} from "@/app/lib/iam";
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

const QUICK_ARNS: { label: string; value: ResourceArn }[] = [
  { label: "All courses", value: arn.course("*") },
  { label: "Web A11y (crs_web_a11y)", value: arn.course("crs_web_a11y") },
  { label: "Linear Alg (crs_lin_alg)", value: arn.course("crs_lin_alg") },
  {
    label: "Recommended tag",
    value: arn.tag("tag_curated_recommended"),
  },
  { label: "All curated tags", value: arn.tag("tag_curated_*") },
  { label: "Standard topic tags", value: arn.tag("tag_topic_*") },
  { label: "Review Queue", value: arn.admin("review-queue") },
  { label: "All users", value: arn.user("*") },
  { label: "Self-Modify (explicit)", value: arn.selfModify() },
  { label: "Everything (sn:*)", value: arn.all() },
];

const SIMULATOR_SCENARIOS: {
  label: string;
  principalId: string;
  action: IamAction;
  resource: ResourceArn;
}[] = [
  {
    label: "Alex edits owned course",
    principalId: "usr_alex_01",
    action: "course:edit",
    resource: arn.course("crs_web_a11y"),
  },
  {
    label: "Alex edits other course",
    principalId: "usr_alex_01",
    action: "course:edit",
    resource: arn.course("crs_lin_alg"),
  },
  {
    label: "Priya applies Recommended",
    principalId: "usr_priya_03",
    action: "tag:apply",
    resource: arn.tag("tag_curated_recommended"),
  },
  {
    label: "Sam self-modify (wildcard blocked)",
    principalId: "usr_sam_04",
    action: "user:self:modify",
    resource: arn.selfModify(),
  },
  {
    label: "Jordan (suspended) app access",
    principalId: "usr_jordan_05",
    action: "app:access",
    resource: arn.app(),
  },
];

function slugifyRoleId(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean ? `role_${clean}` : "";
}

export default function AdminRolesPage() {
  const {
    user: currentUser,
    can,
    canSelfModify,
    canEditRole,
    roles,
    hasCustomRoles,
    principals,
    createRole,
    deleteRole,
    addRoleStatement,
    removeRoleStatement,
    resetRoles,
  } = useAuth();

  const canManageRoles = can("iam:roles:manage", arn.iam("*"));

  const roleList = useMemo(() => Object.values(roles), [roles]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("role_member");

  const activeRole = roles[selectedRoleId] ?? roleList[0];
  const isRoleAttachedToSelf = Boolean(
    activeRole && currentUser?.globalRoles.includes(activeRole.id)
  );
  const canEditActiveRole = activeRole ? canEditRole(activeRole.id) : false;
  const selfRoleLocked = isRoleAttachedToSelf && !canEditActiveRole;

  // Create Role form state
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const roleNameId = useId();
  const roleDescId = useId();

  // Add Statement form state
  const [stmtEffect, setStmtEffect] = useState<PolicyEffect>("Allow");
  const [stmtAction, setStmtAction] = useState<IamAction>("tag:apply");
  const [stmtResource, setStmtResource] = useState<string>(
    arn.tag("tag_curated_recommended")
  );
  const [stmtError, setStmtError] = useState<string | null>(null);
  const stmtActionId = useId();
  const stmtResourceId = useId();

  // Live Policy Simulator state
  const [simPrincipalId, setSimPrincipalId] = useState<string>(
    principals[0]?.id ?? "usr_alex_01"
  );
  const [simAction, setSimAction] = useState<IamAction>("course:edit");
  const [simResource, setSimResource] = useState<string>(
    arn.course("crs_web_a11y")
  );
  const simPrincipalSelectId = useId();
  const simActionSelectId = useId();
  const simResourceInputId = useId();

  const simPrincipal = useMemo(
    () => principals.find((p) => p.id === simPrincipalId) ?? principals[0],
    [principals, simPrincipalId]
  );

  const normalizedSimResource: ResourceArn = simResource.startsWith("sn:")
    ? (simResource as ResourceArn)
    : `sn:${simResource}`;

  const simResult = useMemo(
    () =>
      evaluatePolicy(simPrincipal, simAction, normalizedSimResource, roles),
    [simPrincipal, simAction, normalizedSimResource, roles]
  );

  const handleCreateRole = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newRoleName.trim();
    const id = slugifyRoleId(trimmed);
    if (!trimmed || !id || roles[id]) return;
    createRole({
      id,
      name: trimmed,
      description:
        newRoleDesc.trim() || "Custom IAM role with scoped or global policies.",
    });
    setSelectedRoleId(id);
    setNewRoleName("");
    setNewRoleDesc("");
    setShowCreateRole(false);
  };

  const handleAddStatement = (e: FormEvent) => {
    e.preventDefault();
    if (!activeRole) return;
    const rawArn = stmtResource.trim();
    if (!rawArn.startsWith("sn:") || rawArn.length < 4) {
      setStmtError('Resource ARN must start with "sn:" (e.g. sn:course:*).');
      return;
    }
    const candidate = {
      sid: `${stmtEffect}_${stmtAction.replace(/[^a-z0-9]/gi, "_")}_${Date.now().toString(36).slice(-4)}`,
      effect: stmtEffect,
      actions: [stmtAction],
      resources: [rawArn as ResourceArn],
    };
    if (statementGrantsSelfModify(candidate) && !canSelfModify) {
      setStmtError(
        `Delegation blocked: you cannot attach Allow user:self:modify on ${arn.selfModify()} unless you already hold it yourself.`
      );
      return;
    }
    setStmtError(null);
    addRoleStatement(activeRole.id, candidate);
  };

  const handleDeleteRole = () => {
    if (!activeRole || activeRole.system) return;
    const deletingId = activeRole.id;
    deleteRole(deletingId);
    setSelectedRoleId("role_member");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Roles &amp; Privileges
            </h1>
            <Badge variant="outline" className="font-mono text-[11px]">
              IAM / ARN
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Inspect and edit global role policies using immutable resource ARNs.
            Changes apply immediately across the app and the simulator below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasCustomRoles && canManageRoles && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetRoles}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Reset IAM defaults</span>
            </Button>
          )}
          {canManageRoles && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreateRole((v) => !v)}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>New Role</span>
            </Button>
          )}
        </div>
      </div>

      {/* Inline Create Role Form */}
      {showCreateRole && canManageRoles && (
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create Global Role</CardTitle>
            <CardDescription className="text-xs">
              Creates an empty role bundle—attach Allow/Deny statements next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateRole}
              className="grid gap-3 sm:grid-cols-12 sm:items-end"
            >
              <div className="space-y-1 sm:col-span-4">
                <label
                  htmlFor={roleNameId}
                  className="text-xs font-medium text-foreground"
                >
                  Role name
                </label>
                <Input
                  id={roleNameId}
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Community Mod"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1 sm:col-span-5">
                <label
                  htmlFor={roleDescId}
                  className="text-xs font-medium text-foreground"
                >
                  Description
                </label>
                <Input
                  id={roleDescId}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="What this role is responsible for…"
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !slugifyRoleId(newRoleName) ||
                    Boolean(roles[slugifyRoleId(newRoleName)])
                  }
                >
                  Create
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateRole(false)}
                >
                  Cancel
                </Button>
              </div>
              {newRoleName.trim() && (
                <p className="font-mono text-[11px] text-muted-foreground sm:col-span-12">
                  Immutable ID:{" "}
                  <span className="text-foreground">
                    {slugifyRoleId(newRoleName)}
                  </span>
                  {roles[slugifyRoleId(newRoleName)] && " (already exists)"}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main 2-Column Role Explorer + Statement Editor */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Role Selector & Scoped Templates */}
        <div className="space-y-4 lg:col-span-4">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Global Roles ({roleList.length})
            </h2>
            <div className="space-y-1.5">
              {roleList.map((role) => {
                const selected = activeRole?.id === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected
                        ? "border-primary bg-accent ring-1 ring-primary"
                        : "border-border bg-background hover:bg-surface/70"
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Shield
                          className="size-3.5 text-primary"
                          aria-hidden="true"
                        />
                        <span>{role.name}</span>
                      </span>
                      <Badge
                        variant="secondary"
                        className="h-4 px-1.5 font-mono text-[10px]"
                      >
                        {role.statements.length}
                      </Badge>
                    </div>
                    <code className="font-mono text-[11px] text-muted-foreground">
                      {role.id}
                    </code>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Scoped Role Templates Reference */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scoped Role Templates
            </h2>
            <p className="text-xs text-muted-foreground">
              Attached per immutable resource ID (e.g.{" "}
              <code className="font-mono text-[11px]">crs_web_a11y</code>) so
              users own only their courses.
            </p>
            <div className="space-y-2">
              {Object.values(SCOPED_ROLE_TEMPLATES).map((tpl) => {
                const sample = tpl.buildStatements("<courseId>")[0];
                return (
                  <div
                    key={tpl.id}
                    className="space-y-1.5 rounded-xl border border-border bg-surface/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {tpl.name}
                      </span>
                      <code className="font-mono text-[10px] text-muted-foreground">
                        {tpl.id}
                      </code>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {tpl.description}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {sample.actions.map((act) => (
                        <span
                          key={act}
                          className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Active Role Statements & Add Statement Form */}
        <div className="space-y-4 lg:col-span-8">
          {activeRole && (
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">
                        {activeRole.name}
                      </CardTitle>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {activeRole.id}
                      </code>
                      {activeRole.system && (
                        <Badge variant="secondary" className="text-[10px]">
                          System
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{activeRole.description}</CardDescription>
                  </div>

                  {canEditActiveRole && !activeRole.system && (
                    <Button
                      type="button"
                      size="xs"
                      variant="destructive"
                      onClick={handleDeleteRole}
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                      <span>Delete Role</span>
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-5">
                {selfRoleLocked && (
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
                        Attached to your own account
                      </p>
                      <p className="text-muted-foreground">
                        Editing a role currently assigned to you requires the
                        explicit{" "}
                        <code className="font-mono text-foreground">
                          Allow user:self:modify
                        </code>{" "}
                        grant on{" "}
                        <code className="font-mono text-foreground">
                          {arn.selfModify()}
                        </code>
                        .
                      </p>
                    </div>
                  </div>
                )}

                {/* Attached Statements List */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Attached Policy Statements ({activeRole.statements.length})
                  </h3>

                  {activeRole.statements.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                      No policy statements yet. Add an Allow or Deny rule below.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activeRole.statements.map((stmt, idx) => {
                        const isDeny = stmt.effect === "Deny";
                        const locked =
                          activeRole.id === "role_super_admin" &&
                          activeRole.statements.length <= 1;

                        return (
                          <div
                            key={`${stmt.sid ?? "stmt"}-${idx}`}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3"
                          >
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={isDeny ? "destructive" : "default"}
                                  className="h-5 px-2 text-[10px] font-semibold"
                                >
                                  {stmt.effect}
                                </Badge>
                                {stmt.sid && (
                                  <span className="font-mono text-[11px] text-muted-foreground">
                                    {stmt.sid}
                                  </span>
                                )}
                              </div>

                              <div className="grid gap-2 text-xs sm:grid-cols-2">
                                <div className="space-y-1">
                                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Actions
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {stmt.actions.map((act) => (
                                      <code
                                        key={act}
                                        className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                                      >
                                        {act}
                                      </code>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Resources (ARN)
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {stmt.resources.map((res) => (
                                      <code
                                        key={res}
                                        className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                                      >
                                        {res}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {canEditActiveRole && (
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="ghost"
                                disabled={locked}
                                aria-label={`Remove statement ${stmt.sid ?? idx + 1}`}
                                title={
                                  locked
                                    ? "Super Admin keeps at least one wildcard statement"
                                    : "Remove statement"
                                }
                                onClick={() =>
                                  removeRoleStatement(activeRole.id, idx)
                                }
                              >
                                <Trash2
                                  className="size-3.5 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add Statement Form */}
                {canEditActiveRole && (
                  <>
                    <Separator />
                    <form onSubmit={handleAddStatement} className="space-y-3">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <KeyRound className="size-3.5" aria-hidden="true" />
                        <span>Add Policy Statement to {activeRole.name}</span>
                      </h3>

                      <div className="grid gap-3 sm:grid-cols-12">
                        {/* Effect */}
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
                                  stmtEffect === eff
                                    ? eff === "Deny"
                                      ? "destructive"
                                      : "default"
                                    : "outline"
                                }
                                aria-pressed={stmtEffect === eff}
                                onClick={() => setStmtEffect(eff)}
                              >
                                {eff}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Action */}
                        <div className="space-y-1 sm:col-span-4">
                          <label
                            htmlFor={stmtActionId}
                            className="block text-xs font-medium text-foreground"
                          >
                            Action
                          </label>
                          <select
                            id={stmtActionId}
                            value={stmtAction}
                            onChange={(e) =>
                              setStmtAction(e.target.value as IamAction)
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

                        {/* Resource ARN */}
                        <div className="space-y-1 sm:col-span-5">
                          <label
                            htmlFor={stmtResourceId}
                            className="block text-xs font-medium text-foreground"
                          >
                            Resource ARN
                          </label>
                          <Input
                            id={stmtResourceId}
                            value={stmtResource}
                            onChange={(e) => setStmtResource(e.target.value)}
                            placeholder="sn:course:crs_web_a11y"
                            className="h-9 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Quick ARN chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          Quick ARN:
                        </span>
                        {QUICK_ARNS.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setStmtResource(item.value)}
                            className="rounded-md border border-border bg-surface/60 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {stmtError && (
                        <p role="alert" className="text-xs text-destructive">
                          {stmtError}
                        </p>
                      )}

                      <div>
                        <Button type="submit" size="sm">
                          <Plus className="size-3.5" aria-hidden="true" />
                          <span>Attach Statement</span>
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Live IAM Policy Simulator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                <span>Live Policy Simulator</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Test any principal + action + immutable ARN against the live
                role table (Explicit Deny &gt; Explicit Allow &gt; Implicit
                Deny).
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Scenarios */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Try:
            </span>
            {SIMULATOR_SCENARIOS.map((sc) => (
              <Button
                key={sc.label}
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  setSimPrincipalId(sc.principalId);
                  setSimAction(sc.action);
                  setSimResource(sc.resource);
                }}
              >
                {sc.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor={simPrincipalSelectId}
                className="block text-xs font-medium text-foreground"
              >
                Principal
              </label>
              <select
                id={simPrincipalSelectId}
                value={simPrincipalId}
                onChange={(e) => setSimPrincipalId(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {principals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.roleSummary})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor={simActionSelectId}
                className="block text-xs font-medium text-foreground"
              >
                Action
              </label>
              <select
                id={simActionSelectId}
                value={simAction}
                onChange={(e) => setSimAction(e.target.value as IamAction)}
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 font-mono text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {ALL_IAM_ACTIONS.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor={simResourceInputId}
                className="block text-xs font-medium text-foreground"
              >
                Resource ARN
              </label>
              <Input
                id={simResourceInputId}
                value={simResource}
                onChange={(e) => setSimResource(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>

          {/* Live Evaluation Verdict */}
          <div
            role="status"
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5",
              simResult.allowed
                ? "border-emerald-500/40 bg-emerald-500/10"
                : simResult.decision === "explicit-deny"
                  ? "border-destructive/50 bg-destructive/10"
                  : "border-border bg-surface/60"
            )}
          >
            <div className="flex items-center gap-2.5">
              {simResult.allowed ? (
                <CheckCircle2
                  className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : simResult.decision === "explicit-deny" ? (
                <ShieldBan
                  className="size-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
              ) : (
                <ShieldAlert
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}

              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {simResult.allowed ? "Allowed" : "Denied"}
                  </span>
                  <Badge
                    variant={
                      simResult.allowed
                        ? "secondary"
                        : simResult.decision === "explicit-deny"
                          ? "destructive"
                          : "outline"
                    }
                    className="font-mono text-[10px]"
                  >
                    {simResult.decision}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {simPrincipal?.name} →{" "}
                  <code className="font-mono text-foreground">{simAction}</code>{" "}
                  on{" "}
                  <code className="font-mono text-foreground">
                    {normalizedSimResource}
                  </code>
                </p>
              </div>
            </div>

            {simResult.matchedSource ? (
              <div className="text-right font-mono text-[11px] text-muted-foreground">
                <div>Matched: {simResult.matchedSource}</div>
                {simResult.matchedSid && <div>SID: {simResult.matchedSid}</div>}
              </div>
            ) : (
              <span className="font-mono text-[11px] text-muted-foreground">
                No matching Allow statement
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
