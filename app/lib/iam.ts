/**
 * Shy Notes IAM & ARN Authorization Engine
 *
 * Loosely modeled on AWS IAM:
 *  - Every protected entity is addressed by an immutable ID ARN:
 *      sn:<service>:<resource-id>[/<sub-resource>]
 *  - Roles are reusable bundles of PolicyStatements (global or resource-scoped).
 *  - Users may also carry direct inline Allow / Deny policy overrides.
 *  - Evaluation order: Explicit Deny > Explicit Allow > Implicit Deny.
 */

export type PolicyEffect = "Allow" | "Deny";

export type IamAction =
  | "*"
  | "app:access"
  | "course:*"
  | "course:read"
  | "course:create"
  | "course:edit"
  | "course:delete"
  | "course:publish:submit"
  | "course:suggestions:create"
  | "course:suggestions:approve"
  | "course:analytics:read"
  | "course:settings:manage"
  | "course:members:manage"
  | "course:review:*"
  | "course:review:list"
  | "course:review:approve"
  | "course:review:deny"
  | "tag:*"
  | "tag:apply"
  | "tag:remove"
  | "tag:manage"
  | "admin:*"
  | "admin:access"
  | "user:*"
  | "user:read"
  | "user:suspend"
  | "user:manage"
  | "user:self:modify"
  | "iam:*"
  | "iam:roles:read"
  | "iam:roles:manage";

export type ResourceArn = `sn:${string}`;

/**
 * Actions that NEVER match wildcards (`*`, `user:*`, `sn:*`) on Allow statements.
 * They require an explicit, exact Action + exact Resource ARN Allow grant.
 * Explicit Deny statements still match via wildcards (e.g. account suspension).
 */
export const EXPLICIT_ONLY_ACTIONS = new Set<IamAction>(["user:self:modify"]);

/**
 * Immutable ID-based ARN builders.
 * Prefer immutable resource IDs (e.g. `crs_web_a11y`, `tag_curated_recommended`)
 * over mutable URL slugs so renames never break or leak permissions.
 */
export const arn = {
  all: (): ResourceArn => "sn:*",
  app: (): ResourceArn => "sn:app:workspace",
  course: (courseId: string = "*"): ResourceArn => `sn:course:${courseId}`,
  coursePage: (courseId: string, pageId: string = "*"): ResourceArn =>
    `sn:course:${courseId}/page/${pageId}`,
  tag: (tagId: string = "*"): ResourceArn => `sn:tag:${tagId}`,
  user: (userId: string = "*"): ResourceArn => `sn:user:${userId}`,
  selfModify: (): ResourceArn => "sn:iam:self-modify",
  admin: (area: string = "*"): ResourceArn => `sn:admin:${area}`,
  iam: (target: string = "*"): ResourceArn => `sn:iam:${target}`,
} as const;

export interface PolicyStatement {
  sid?: string;
  effect: PolicyEffect;
  actions: (IamAction | `${string}*`)[];
  resources: ResourceArn[];
}

export type BuiltInGlobalRoleId =
  | "role_member"
  | "role_course_reviewer"
  | "role_content_curator"
  | "role_user_moderator"
  | "role_super_admin";

export type GlobalRoleId = BuiltInGlobalRoleId | (string & {});

export type ScopedRoleId =
  | "course_owner"
  | "course_editor"
  | "course_maintainer"
  | "course_ta"
  | "course_reviewer";

export interface GlobalRoleDefinition {
  id: GlobalRoleId;
  name: string;
  description: string;
  system?: boolean;
  statements: PolicyStatement[];
}

export const ALL_IAM_ACTIONS: IamAction[] = [
  "*",
  "app:access",
  "course:*",
  "course:read",
  "course:create",
  "course:edit",
  "course:delete",
  "course:publish:submit",
  "course:suggestions:create",
  "course:suggestions:approve",
  "course:analytics:read",
  "course:settings:manage",
  "course:members:manage",
  "course:review:*",
  "course:review:list",
  "course:review:approve",
  "course:review:deny",
  "tag:*",
  "tag:apply",
  "tag:remove",
  "tag:manage",
  "admin:*",
  "admin:access",
  "user:*",
  "user:read",
  "user:suspend",
  "user:manage",
  "user:self:modify",
  "iam:*",
  "iam:roles:read",
  "iam:roles:manage",
];

export interface ScopedRoleTemplate {
  id: ScopedRoleId;
  name: string;
  /** Numeric hierarchy rank (higher = more authority; 100 = Owner). */
  rank: number;
  description: string;
  buildStatements: (resourceId: string) => PolicyStatement[];
}

export interface ScopedRoleGrant {
  roleId: ScopedRoleId;
  resourceId: string; // immutable ID, e.g. "crs_web_a11y"
  resourceLabel?: string;
}

export interface IamPrincipal {
  id: string;
  globalRoles: GlobalRoleId[];
  scopedRoles: ScopedRoleGrant[];
  inlinePolicies?: PolicyStatement[];
}

export const GLOBAL_ROLES: Record<BuiltInGlobalRoleId, GlobalRoleDefinition> = {
  role_member: {
    id: "role_member",
    name: "Member",
    system: true,
    description:
      "Base authenticated privileges: study courses, create draft courses, submit suggestions, and apply standard topic tags.",
    statements: [
      {
        sid: "MemberAppAccess",
        effect: "Allow",
        actions: ["app:access"],
        resources: [arn.app()],
      },
      {
        sid: "MemberCourseBase",
        effect: "Allow",
        actions: [
          "course:read",
          "course:create",
          "course:suggestions:create",
        ],
        resources: [arn.course("*")],
      },
      {
        sid: "MemberTopicTags",
        effect: "Allow",
        actions: ["tag:apply", "tag:remove"],
        resources: [arn.tag("tag_topic_*")],
      },
    ],
  },

  role_course_reviewer: {
    id: "role_course_reviewer",
    name: "Course Reviewer",
    description:
      "Reviews pending course publication requests in the moderation queue and approves or denies publication.",
    statements: [
      {
        sid: "ReviewerAdminQueue",
        effect: "Allow",
        actions: ["admin:access"],
        resources: [arn.admin("overview"), arn.admin("review-queue")],
      },
      {
        sid: "ReviewerCourseActions",
        effect: "Allow",
        actions: ["course:review:*"],
        resources: [arn.course("*")],
      },
    ],
  },

  role_content_curator: {
    id: "role_content_curator",
    name: "Content Curator",
    description:
      "Applies and removes protected editorial tags such as Recommended and Staff Pick.",
    statements: [
      {
        sid: "CuratorAdminAccess",
        effect: "Allow",
        actions: ["admin:access"],
        resources: [arn.admin("overview"), arn.admin("review-queue")],
      },
      {
        sid: "CuratorProtectedTags",
        effect: "Allow",
        actions: ["tag:apply", "tag:remove"],
        resources: [arn.tag("tag_curated_*")],
      },
    ],
  },

  role_user_moderator: {
    id: "role_user_moderator",
    name: "User Moderator",
    description: "Inspects user accounts and manages account suspensions.",
    statements: [
      {
        sid: "UserModAdminAccess",
        effect: "Allow",
        actions: ["admin:access"],
        resources: [arn.admin("overview"), arn.admin("users")],
      },
      {
        sid: "UserModActions",
        effect: "Allow",
        actions: ["user:read", "user:suspend", "user:manage"],
        resources: [arn.user("*")],
      },
    ],
  },

  role_super_admin: {
    id: "role_super_admin",
    name: "Super Admin",
    system: true,
    description:
      "Unrestricted global access across courses, tags, users, and IAM roles.",
    statements: [
      {
        sid: "SuperAdminAll",
        effect: "Allow",
        actions: ["*"],
        resources: [arn.all()],
      },
    ],
  },
};

export const SCOPED_ROLE_TEMPLATES: Record<ScopedRoleId, ScopedRoleTemplate> = {
  course_owner: {
    id: "course_owner",
    name: "Course Owner",
    rank: 100,
    description:
      "Top course authority: full edit, settings, deletion, and can assign or modify any course role including other Owners.",
    buildStatements: (courseId) => [
      {
        sid: `CourseOwner_${courseId}`,
        effect: "Allow",
        actions: [
          "course:edit",
          "course:delete",
          "course:publish:submit",
          "course:suggestions:approve",
          "course:analytics:read",
          "course:settings:manage",
          "course:members:manage",
        ],
        resources: [arn.course(courseId), arn.coursePage(courseId, "*")],
      },
    ],
  },

  course_maintainer: {
    id: "course_maintainer",
    name: "Maintainer",
    rank: 40,
    description:
      "Edit course pages, approve suggestions, and view course analytics.",
    buildStatements: (courseId) => [
      {
        sid: `CourseMaintainer_${courseId}`,
        effect: "Allow",
        actions: [
          "course:edit",
          "course:suggestions:approve",
          "course:analytics:read",
        ],
        resources: [arn.course(courseId), arn.coursePage(courseId, "*")],
      },
    ],
  },

  course_editor: {
    id: "course_editor",
    name: "Editor",
    rank: 30,
    description:
      "Create, edit, and organize modules and pages, and approve learner suggestions.",
    buildStatements: (courseId) => [
      {
        sid: `CourseEditor_${courseId}`,
        effect: "Allow",
        actions: ["course:edit", "course:suggestions:approve"],
        resources: [arn.course(courseId), arn.coursePage(courseId, "*")],
      },
    ],
  },

  course_ta: {
    id: "course_ta",
    name: "Teaching Assistant",
    rank: 20,
    description:
      "Manage enrolled learners and assign lower roles (Suggestion Reviewer / Learner); cannot modify peers, Editors, Maintainers, or Owners.",
    buildStatements: (courseId) => [
      {
        sid: `CourseTA_${courseId}`,
        effect: "Allow",
        actions: [
          "course:suggestions:approve",
          "course:analytics:read",
          "course:members:manage",
        ],
        resources: [arn.course(courseId), arn.coursePage(courseId, "*")],
      },
    ],
  },

  course_reviewer: {
    id: "course_reviewer",
    name: "Suggestion Reviewer",
    rank: 10,
    description:
      "Triages and approves learner suggestions and views course analytics.",
    buildStatements: (courseId) => [
      {
        sid: `CourseReviewer_${courseId}`,
        effect: "Allow",
        actions: ["course:suggestions:approve", "course:analytics:read"],
        resources: [arn.course(courseId), arn.coursePage(courseId, "*")],
      },
    ],
  },
};

export const COURSE_OWNER_RANK = SCOPED_ROLE_TEMPLATES.course_owner.rank;

export function getCourseRoleRank(roleId: ScopedRoleId | null): number {
  if (!roleId) return 0;
  return SCOPED_ROLE_TEMPLATES[roleId]?.rank ?? 0;
}

export function getUserCourseRole(
  principal: IamPrincipal | null | undefined,
  courseId: string
): ScopedRoleId | null {
  if (!principal) return null;
  let bestRole: ScopedRoleId | null = null;
  let bestRank = 0;
  for (const grant of principal.scopedRoles) {
    if (grant.resourceId !== courseId) continue;
    const rank = getCourseRoleRank(grant.roleId);
    if (rank >= bestRank) {
      bestRank = rank;
      bestRole = grant.roleId;
    }
  }
  return bestRole;
}

export function getActorCourseRank(
  actor: IamPrincipal | null | undefined,
  courseId: string,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): number {
  if (!actor) return 0;
  // Global super-admin / wildcard course managers act at Owner-tier rank
  if (
    can(actor, "course:settings:manage", arn.course("*"), roleRegistry) &&
    can(actor, "course:delete", arn.course("*"), roleRegistry)
  ) {
    return COURSE_OWNER_RANK;
  }
  return getCourseRoleRank(getUserCourseRole(actor, courseId));
}

/**
 * Checks whether `actor` can modify `target`'s course role on `courseId`
 * and assign `nextRoleId` (or `null` for read-only Learner).
 *
 * Hierarchy rules:
 *  - Only Course Owners (rank >= 100) can modify other Owners or assign Owner/Maintainer/Editor/TA.
 *  - Lower managers (e.g. Teaching Assistant, rank 20) can ONLY modify targets strictly below
 *    their own rank and assign roles strictly below their own rank.
 *  - Self-modification still requires the explicit `user:self:modify` ARN.
 */
export function canAssignCourseRole(
  actor: IamPrincipal | null | undefined,
  courseId: string,
  target: IamPrincipal,
  nextRoleId: ScopedRoleId | null,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): boolean {
  if (!actor) return false;
  const courseArn = arn.course(courseId);
  const hasMemberControl =
    can(actor, "course:members:manage", courseArn, roleRegistry) ||
    can(actor, "course:settings:manage", courseArn, roleRegistry);
  if (!hasMemberControl) return false;

  if (actor.id === target.id && !canModifySelf(actor, roleRegistry)) {
    return false;
  }

  const actorRank = getActorCourseRank(actor, courseId, roleRegistry);
  const targetRank = getCourseRoleRank(getUserCourseRole(target, courseId));
  const nextRank = getCourseRoleRank(nextRoleId);

  if (actorRank >= COURSE_OWNER_RANK) {
    return true;
  }

  return targetRank < actorRank && nextRank < actorRank;
}

export function canManageCourseTarget(
  actor: IamPrincipal | null | undefined,
  courseId: string,
  target: IamPrincipal,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): boolean {
  if (!actor) return false;
  const courseArn = arn.course(courseId);
  const hasMemberControl =
    can(actor, "course:members:manage", courseArn, roleRegistry) ||
    can(actor, "course:settings:manage", courseArn, roleRegistry);
  if (!hasMemberControl) return false;

  if (actor.id === target.id && !canModifySelf(actor, roleRegistry)) {
    return false;
  }

  const actorRank = getActorCourseRank(actor, courseId, roleRegistry);
  if (actorRank >= COURSE_OWNER_RANK) return true;

  const targetRank = getCourseRoleRank(getUserCourseRole(target, courseId));
  return targetRank < actorRank;
}

export function getAssignableCourseRoles(
  actor: IamPrincipal | null | undefined,
  courseId: string,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): ScopedRoleTemplate[] {
  const actorRank = getActorCourseRank(actor, courseId, roleRegistry);
  const all = Object.values(SCOPED_ROLE_TEMPLATES).sort(
    (a, b) => b.rank - a.rank
  );
  if (actorRank >= COURSE_OWNER_RANK) return all;
  return all.filter((tpl) => tpl.rank < actorRank);
}

/**
 * True if a policy statement explicitly grants `user:self:modify` on `sn:iam:self-modify`.
 */
export function statementGrantsSelfModify(statement: PolicyStatement): boolean {
  return (
    statement.effect === "Allow" &&
    statement.actions.includes("user:self:modify") &&
    statement.resources.includes(arn.selfModify())
  );
}

/**
 * True if a global role definition grants `user:self:modify` on `sn:iam:self-modify`.
 */
export function roleGrantsSelfModify(
  roleDef: GlobalRoleDefinition | undefined
): boolean {
  if (!roleDef) return false;
  return roleDef.statements.some(statementGrantsSelfModify);
}

interface SourcedStatement {
  source: string;
  statement: PolicyStatement;
}

/**
 * Matches a simple `*` glob pattern against a candidate string.
 */
export function matchWildcard(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  if (!pattern.includes("*")) return pattern === value;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

export function collectPrincipalStatements(
  principal: IamPrincipal,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): SourcedStatement[] {
  const collected: SourcedStatement[] = [];

  for (const roleId of principal.globalRoles) {
    const def = roleRegistry[roleId];
    if (!def) continue;
    for (const statement of def.statements) {
      collected.push({ source: `global:${def.id}`, statement });
    }
  }

  for (const grant of principal.scopedRoles) {
    const tpl = SCOPED_ROLE_TEMPLATES[grant.roleId];
    if (!tpl) continue;
    for (const statement of tpl.buildStatements(grant.resourceId)) {
      collected.push({
        source: `scoped:${tpl.id}@${grant.resourceId}`,
        statement,
      });
    }
  }

  if (principal.inlinePolicies) {
    for (const statement of principal.inlinePolicies) {
      collected.push({ source: "inline:user-policy", statement });
    }
  }

  return collected;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  decision: "explicit-deny" | "explicit-allow" | "implicit-deny";
  matchedSource?: string;
  matchedSid?: string;
}

/**
 * Evaluates whether `principal` is allowed to perform `action` on `resource`.
 * Precedence: Explicit Deny > Explicit Allow > Implicit Deny.
 */
export function evaluatePolicy(
  principal: IamPrincipal | null | undefined,
  action: IamAction,
  resource: ResourceArn,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): PolicyEvaluationResult {
  if (!principal) {
    return { allowed: false, decision: "implicit-deny" };
  }

  const statements = collectPrincipalStatements(principal, roleRegistry);
  const requiresExactAllow = EXPLICIT_ONLY_ACTIONS.has(action);
  let allowMatch: SourcedStatement | null = null;

  for (const entry of statements) {
    const { statement } = entry;
    const exactOnly = requiresExactAllow && statement.effect === "Allow";

    const actionMatches = statement.actions.some((pat) =>
      exactOnly ? pat === action : matchWildcard(pat, action)
    );
    if (!actionMatches) continue;

    const resourceMatches = statement.resources.some((pat) =>
      exactOnly ? pat === resource : matchWildcard(pat, resource)
    );
    if (!resourceMatches) continue;

    if (statement.effect === "Deny") {
      return {
        allowed: false,
        decision: "explicit-deny",
        matchedSource: entry.source,
        matchedSid: statement.sid,
      };
    }

    if (!allowMatch) {
      allowMatch = entry;
    }
  }

  if (allowMatch) {
    return {
      allowed: true,
      decision: "explicit-allow",
      matchedSource: allowMatch.source,
      matchedSid: allowMatch.statement.sid,
    };
  }

  return { allowed: false, decision: "implicit-deny" };
}

/**
 * Checks whether `principal` holds the explicit, non-wildcard break-glass ARN
 * required to modify their own account, attached roles, or privileges.
 */
export function canModifySelf(
  principal: IamPrincipal | null | undefined,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): boolean {
  return evaluatePolicy(
    principal,
    "user:self:modify",
    arn.selfModify(),
    roleRegistry
  ).allowed;
}

/**
 * Checks whether `actor` may modify `targetUserId`'s account, roles, or privileges.
 * Self-modification is blocked unless `actor` explicitly holds
 * `Allow user:self:modify` on `sn:iam:self-modify`.
 */
export function canModifyTargetUser(
  actor: IamPrincipal | null | undefined,
  targetUserId: string,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): boolean {
  if (!actor) return false;
  if (!can(actor, "user:manage", arn.user(targetUserId), roleRegistry)) {
    return false;
  }
  if (actor.id === targetUserId) {
    return canModifySelf(actor, roleRegistry);
  }
  return true;
}

/**
 * Checks whether `actor` may modify a global role definition.
 * Modifying a role currently attached to `actor` counts as self-modification
 * and requires the explicit `user:self:modify` on `sn:iam:self-modify` ARN.
 */
export function canModifyRole(
  actor: IamPrincipal | null | undefined,
  roleId: string,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): boolean {
  if (!actor) return false;
  if (!can(actor, "iam:roles:manage", arn.iam(roleId), roleRegistry)) {
    return false;
  }
  if (actor.globalRoles.includes(roleId)) {
    return canModifySelf(actor, roleRegistry);
  }
  return true;
}

export function can(
  principal: IamPrincipal | null | undefined,
  action: IamAction,
  resource: ResourceArn,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): boolean {
  return evaluatePolicy(principal, action, resource, roleRegistry).allowed;
}

export function canAny(
  principal: IamPrincipal | null | undefined,
  checks: readonly [IamAction, ResourceArn][],
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): boolean {
  return checks.some(([action, resource]) =>
    can(principal, action, resource, roleRegistry)
  );
}

/**
 * Convenience predicate for whether a principal holds any admin/moderation
 * console capability (review queue, user management, IAM, or global admin).
 */
export function hasAnyAdminAccess(
  principal: IamPrincipal | null | undefined,
  roleRegistry: Record<string, GlobalRoleDefinition> = GLOBAL_ROLES
): boolean {
  return canAny(
    principal,
    [
      ["admin:access", arn.admin("overview")],
      ["admin:access", arn.admin("review-queue")],
      ["admin:access", arn.admin("users")],
      ["admin:access", arn.admin("iam")],
      ["course:review:list", arn.course("*")],
      ["user:manage", arn.user("*")],
      ["iam:roles:read", arn.iam("*")],
    ],
    roleRegistry
  );
}
