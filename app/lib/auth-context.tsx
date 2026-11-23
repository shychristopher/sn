"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GLOBAL_ROLES,
  arn,
  can as evaluateCan,
  canAssignCourseRole,
  canModifyRole,
  canModifySelf,
  canModifyTargetUser,
  evaluatePolicy,
  hasAnyAdminAccess,
  roleGrantsSelfModify,
  statementGrantsSelfModify,
  type GlobalRoleDefinition,
  type GlobalRoleId,
  type IamAction,
  type IamPrincipal,
  type PolicyEvaluationResult,
  type PolicyStatement,
  type ResourceArn,
  type ScopedRoleGrant,
} from "@/app/lib/iam";

export interface SuspensionDetails {
  reason: string;
  suspendedAt: string;
  referenceId: string;
  appealEmail: string;
}

export interface AuthUser extends IamPrincipal {
  name: string;
  email: string;
  avatarUrl: string;
  initials: string;
  /** Human-friendly badge summary derived dynamically from attached roles */
  roleSummary: string;
  globalRoles: GlobalRoleId[];
  scopedRoles: ScopedRoleGrant[];
  inlinePolicies?: PolicyStatement[];
  suspended: boolean;
  suspension?: SuspensionDetails;
  system?: boolean;
}

export type ActiveSessionId = "signed-out" | (string & {});

const AVATAR_POOL = [
  "/avatars/learner.svg",
  "/avatars/teacher.svg",
  "/avatars/admin.svg",
] as const;

export function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function deriveRoleSummary(
  user: Pick<AuthUser, "globalRoles" | "scopedRoles" | "suspended">,
  roles: Record<string, GlobalRoleDefinition>
): string {
  if (user.suspended) return "Suspended";
  if (user.globalRoles.includes("role_super_admin")) {
    return roles.role_super_admin?.name ?? "Super Admin";
  }

  const elevated = user.globalRoles
    .filter((id) => id !== "role_member")
    .map((id) => roles[id]?.name ?? id);

  if (elevated.length > 0) {
    return elevated.length === 1
      ? elevated[0]
      : `${elevated[0]} +${elevated.length - 1}`;
  }

  if (user.scopedRoles.length > 0) {
    const count = user.scopedRoles.length;
    return `Member · ${count} scoped ${count === 1 ? "grant" : "grants"}`;
  }

  if (user.globalRoles.includes("role_member")) {
    return roles.role_member?.name ?? "Member";
  }

  return "No Roles";
}

function createDefaultUsers(): AuthUser[] {
  return [
    {
      id: "usr_alex_01",
      name: "Alex Rivera",
      email: "alex@shynotes.org",
      avatarUrl: "/avatars/learner.svg",
      initials: "AR",
      roleSummary: "Member · 1 scoped grant",
      globalRoles: ["role_member"],
      scopedRoles: [
        {
          roleId: "course_owner",
          resourceId: "crs_web_a11y",
          resourceLabel: "Accessible Web Foundations",
        },
      ],
      suspended: false,
      system: true,
    },
    {
      id: "usr_morgan_02",
      name: "Morgan Patel",
      email: "morgan@shynotes.org",
      avatarUrl: "/avatars/teacher.svg",
      initials: "MP",
      roleSummary: "Course Reviewer",
      globalRoles: ["role_member", "role_course_reviewer"],
      scopedRoles: [
        {
          roleId: "course_maintainer",
          resourceId: "crs_lin_alg",
          resourceLabel: "Linear Algebra Study Notes",
        },
      ],
      suspended: false,
      system: true,
    },
    {
      id: "usr_priya_03",
      name: "Priya Nair",
      email: "priya@shynotes.org",
      avatarUrl: "/avatars/teacher.svg",
      initials: "PN",
      roleSummary: "Content Curator",
      globalRoles: ["role_member", "role_content_curator"],
      scopedRoles: [],
      suspended: false,
      system: true,
    },
    {
      id: "usr_sam_04",
      name: "Sam Chen",
      email: "sam@shynotes.org",
      avatarUrl: "/avatars/admin.svg",
      initials: "SC",
      roleSummary: "Super Admin",
      globalRoles: ["role_super_admin"],
      scopedRoles: [],
      suspended: false,
      system: true,
    },
    {
      id: "usr_jordan_05",
      name: "Jordan Taylor",
      email: "jordan@shynotes.org",
      avatarUrl: "/avatars/suspended.svg",
      initials: "JT",
      roleSummary: "Suspended",
      globalRoles: ["role_member"],
      scopedRoles: [],
      inlinePolicies: [
        {
          sid: "AccountSuspendedDenyAll",
          effect: "Deny",
          actions: ["*"],
          resources: [arn.all()],
        },
      ],
      suspended: true,
      suspension: {
        reason:
          "Repeated automated submissions and violations of the Shy Notes community contribution guidelines.",
        suspendedAt: "November 18, 2026",
        referenceId: "SN-SUSP-4092",
        appealEmail: "appeals@shynotes.org",
      },
      system: true,
    },
  ];
}

const ACTIVE_USER_STORAGE_KEY = "shynotes:mock-active-user:v2";
const LEGACY_PRESET_STORAGE_KEY = "shynotes:mock-auth-preset";
const USERS_STORAGE_KEY = "shynotes:mock-iam-users:v1";
const ROLES_STORAGE_KEY = "shynotes:mock-iam-roles:v1";

function cloneDefaultRoles(): Record<string, GlobalRoleDefinition> {
  const out: Record<string, GlobalRoleDefinition> = {};
  for (const [id, def] of Object.entries(GLOBAL_ROLES)) {
    out[id] = {
      ...def,
      statements: def.statements.map((st) => ({
        ...st,
        actions: [...st.actions],
        resources: [...st.resources],
      })),
    };
  }
  return out;
}

function readStoredRoles(): Record<string, GlobalRoleDefinition> | null {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const entries = Object.entries(
      parsed as Record<string, Partial<GlobalRoleDefinition>>
    );
    const out: Record<string, GlobalRoleDefinition> = {};
    for (const [id, def] of entries) {
      if (
        !def ||
        typeof def.name !== "string" ||
        !Array.isArray(def.statements)
      ) {
        continue;
      }
      out[id] = {
        id,
        name: def.name,
        description: typeof def.description === "string" ? def.description : "",
        system: Boolean(def.system),
        statements: def.statements.filter(
          (st): st is PolicyStatement =>
            Boolean(st) &&
            (st.effect === "Allow" || st.effect === "Deny") &&
            Array.isArray(st.actions) &&
            Array.isArray(st.resources)
        ),
      };
    }
    if (!out.role_super_admin) {
      out.role_super_admin = cloneDefaultRoles().role_super_admin;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

function readStoredUsers(): AuthUser[] | null {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(
      (u): u is AuthUser =>
        Boolean(u) &&
        typeof u === "object" &&
        typeof (u as AuthUser).id === "string" &&
        typeof (u as AuthUser).name === "string" &&
        Array.isArray((u as AuthUser).globalRoles) &&
        Array.isArray((u as AuthUser).scopedRoles)
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

function readInitialActiveUserId(availableUsers: AuthUser[]): ActiveSessionId {
  try {
    const stored = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (stored === "signed-out") return "signed-out";
    if (stored && availableUsers.some((u) => u.id === stored)) {
      return stored;
    }
    // Migrate legacy preset key cleanly if present
    const legacy = localStorage.getItem(LEGACY_PRESET_STORAGE_KEY);
    if (legacy === "signed-out") return "signed-out";
    if (legacy === "learner" || legacy === "member") return "usr_alex_01";
    if (legacy === "teacher" || legacy === "reviewer") return "usr_morgan_02";
    if (legacy === "curator") return "usr_priya_03";
    if (legacy === "admin" || legacy === "super-admin") return "usr_sam_04";
    if (legacy === "suspended") return "usr_jordan_05";
  } catch {
    // Ignore storage errors
  }
  return availableUsers[0]?.id ?? "signed-out";
}

export interface CreateUserInput {
  name: string;
  email: string;
  globalRoles: GlobalRoleId[];
}

interface AuthContextValue {
  user: AuthUser | null;
  activeUserId: ActiveSessionId;
  isHydrated: boolean;
  selectUser: (userId: ActiveSessionId) => void;
  signOut: () => void;
  can: (action: IamAction, resource: ResourceArn) => boolean;
  evaluate: (action: IamAction, resource: ResourceArn) => PolicyEvaluationResult;
  hasAdminAccess: boolean;
  canSelfModify: boolean;
  canEditUser: (targetUserId: string) => boolean;
  canEditRole: (roleId: string) => boolean;

  /** Dynamic IAM users directory (persisted in localStorage) */
  users: AuthUser[];
  principals: AuthUser[];
  hasCustomUsers: boolean;
  createUser: (input: CreateUserInput) => AuthUser;
  deleteUser: (userId: string) => void;
  toggleUserGlobalRole: (userId: string, roleId: GlobalRoleId) => void;
  addUserScopedRole: (userId: string, grant: ScopedRoleGrant) => void;
  /** Assigns (or clears with null) a predefined course-scoped role for a user via course:members:manage */
  setCourseRoleForUser: (
    courseId: string,
    courseTitle: string,
    targetUserId: string,
    roleId: ScopedRoleGrant["roleId"] | null
  ) => void;
  /** System-level ownership attachment when a user creates a brand-new course */
  grantCourseOwnershipToCurrentUser: (
    courseId: string,
    courseTitle: string
  ) => void;
  /** Cleans up dangling scoped grants across all users when a course is deleted */
  removeScopedGrantsForCourse: (courseId: string) => void;
  removeUserScopedRole: (
    userId: string,
    roleId: ScopedRoleGrant["roleId"],
    resourceId: string
  ) => void;
  addUserInlinePolicy: (userId: string, statement: PolicyStatement) => void;
  removeUserInlinePolicy: (userId: string, index: number) => void;
  setUserSuspended: (
    userId: string,
    suspended: boolean,
    reason?: string
  ) => void;
  resetUsers: () => void;

  /** Dynamic IAM role registry (persisted in localStorage) */
  roles: Record<string, GlobalRoleDefinition>;
  hasCustomRoles: boolean;
  createRole: (role: Omit<GlobalRoleDefinition, "statements">) => void;
  deleteRole: (roleId: string) => void;
  addRoleStatement: (roleId: string, statement: PolicyStatement) => void;
  removeRoleStatement: (roleId: string, statementIndex: number) => void;
  resetRoles: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<Record<string, GlobalRoleDefinition>>(() =>
    cloneDefaultRoles()
  );
  const [rawUsers, setRawUsers] = useState<AuthUser[]>(() =>
    createDefaultUsers()
  );
  const [activeUserId, setActiveUserId] =
    useState<ActiveSessionId>("usr_alex_01");
  const [hasCustomRoles, setHasCustomRoles] = useState(false);
  const [hasCustomUsers, setHasCustomUsers] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedRoles = readStoredRoles();
      const storedUsers = readStoredUsers();
      const effectiveUsers = storedUsers ?? createDefaultUsers();
      const initialActive = readInitialActiveUserId(effectiveUsers);

      queueMicrotask(() => {
        if (storedRoles) {
          setRoles(storedRoles);
          setHasCustomRoles(true);
        }
        if (storedUsers) {
          setRawUsers(storedUsers);
          setHasCustomUsers(true);
        }
        setActiveUserId(initialActive);
        setIsHydrated(true);
      });
      return;
    } catch {
      // Ignore storage access errors
    }
    queueMicrotask(() => setIsHydrated(true));
  }, []);

  // Recompute dynamic roleSummary labels whenever roles or user assignments change
  const users = useMemo(
    () =>
      rawUsers.map((u) => ({
        ...u,
        roleSummary: deriveRoleSummary(u, roles),
      })),
    [rawUsers, roles]
  );

  const commitUsers = useCallback(
    (updater: (prev: AuthUser[]) => AuthUser[], markCustom = true) => {
      setRawUsers((prev) => {
        const next = updater(prev);
        try {
          if (markCustom) {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
          } else {
            localStorage.removeItem(USERS_STORAGE_KEY);
          }
        } catch {
          // ignore storage errors
        }
        return next;
      });
      setHasCustomUsers(markCustom);
    },
    []
  );

  const commitRoles = useCallback(
    (
      updater: (
        prev: Record<string, GlobalRoleDefinition>
      ) => Record<string, GlobalRoleDefinition>,
      markCustom = true
    ) => {
      setRoles((prev) => {
        const next = updater(prev);
        try {
          if (markCustom) {
            localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(next));
          } else {
            localStorage.removeItem(ROLES_STORAGE_KEY);
          }
        } catch {
          // ignore storage errors
        }
        return next;
      });
      setHasCustomRoles(markCustom);
    },
    []
  );

  const selectUser = useCallback((nextId: ActiveSessionId) => {
    setActiveUserId(nextId);
    try {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, nextId);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const signOut = useCallback(() => {
    selectUser("signed-out");
  }, [selectUser]);

  const user = useMemo(
    () =>
      activeUserId === "signed-out"
        ? null
        : (users.find((u) => u.id === activeUserId) ?? null),
    [activeUserId, users]
  );

  const canSelfModify = useMemo(
    () => canModifySelf(user, roles),
    [user, roles]
  );

  const canEditUser = useCallback(
    (targetUserId: string) => canModifyTargetUser(user, targetUserId, roles),
    [user, roles]
  );

  const canEditRole = useCallback(
    (roleId: string) => canModifyRole(user, roleId, roles),
    [user, roles]
  );

  // --- User CRUD & Role Assignment Mutations (guarded by IAM + Self-Modify boundary) ---
  const createUser = useCallback(
    (input: CreateUserInput): AuthUser => {
      const cleanName = input.name.trim();
      const cleanEmail =
        input.email.trim() ||
        `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@shynotes.org`;
      const slugPart = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 14);
      const id = `usr_${slugPart || "user"}_${Date.now().toString(36).slice(-4)}`;
      const avatarUrl =
        AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];

      const allowedInitialRoles = input.globalRoles.filter(
        (rId) =>
          !roleGrantsSelfModify(roles[rId]) || canModifySelf(user, roles)
      );

      const created: AuthUser = {
        id,
        name: cleanName,
        email: cleanEmail,
        avatarUrl,
        initials: computeInitials(cleanName),
        roleSummary: "Member",
        globalRoles:
          allowedInitialRoles.length > 0
            ? allowedInitialRoles
            : ["role_member"],
        scopedRoles: [],
        suspended: false,
        system: false,
      };

      commitUsers((prev) => [...prev, created]);
      return created;
    },
    [user, roles, commitUsers]
  );

  const deleteUser = useCallback(
    (userId: string) => {
      if (!canModifyTargetUser(user, userId, roles)) return;
      commitUsers((prev) => {
        const target = prev.find((u) => u.id === userId);
        if (!target || target.system) return prev;
        return prev.filter((u) => u.id !== userId);
      });
      if (activeUserId === userId) {
        selectUser("usr_sam_04");
      }
    },
    [user, roles, commitUsers, activeUserId, selectUser]
  );

  const toggleUserGlobalRole = useCallback(
    (userId: string, roleId: GlobalRoleId) => {
      if (!canModifyTargetUser(user, userId, roles)) return;
      commitUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          const exists = u.globalRoles.includes(roleId);
          // Privilege delegation ceiling: cannot grant a role that carries user:self:modify unless actor holds it
          if (
            !exists &&
            roleGrantsSelfModify(roles[roleId]) &&
            !canModifySelf(user, roles)
          ) {
            return u;
          }
          const nextRoles = exists
            ? u.globalRoles.filter((r) => r !== roleId)
            : [...u.globalRoles, roleId];
          return { ...u, globalRoles: nextRoles };
        })
      );
    },
    [user, roles, commitUsers]
  );

  const addUserScopedRole = useCallback(
    (userId: string, grant: ScopedRoleGrant) => {
      if (!canModifyTargetUser(user, userId, roles)) return;
      commitUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          const already = u.scopedRoles.some(
            (g) =>
              g.roleId === grant.roleId && g.resourceId === grant.resourceId
          );
          if (already) return u;
          return { ...u, scopedRoles: [...u.scopedRoles, grant] };
        })
      );
    },
    [user, roles, commitUsers]
  );

  const setCourseRoleForUser = useCallback(
    (
      courseId: string,
      courseTitle: string,
      targetUserId: string,
      roleId: ScopedRoleGrant["roleId"] | null
    ) => {
      if (!user) return;
      const targetUser = users.find((u) => u.id === targetUserId);
      if (!targetUser) return;

      // Enforce course role hierarchy (Owner > Maintainer > Editor > TA > Reviewer > Learner) + self-modify guard
      if (!canAssignCourseRole(user, courseId, targetUser, roleId, roles)) {
        return;
      }

      commitUsers((prev) =>
        prev.map((u) => {
          if (u.id !== targetUserId) return u;
          const withoutThisCourse = u.scopedRoles.filter(
            (g) => g.resourceId !== courseId
          );
          if (!roleId) {
            return { ...u, scopedRoles: withoutThisCourse };
          }
          return {
            ...u,
            scopedRoles: [
              ...withoutThisCourse,
              {
                roleId,
                resourceId: courseId,
                resourceLabel: courseTitle,
              },
            ],
          };
        })
      );
    },
    [user, users, roles, commitUsers]
  );

  const grantCourseOwnershipToCurrentUser = useCallback(
    (courseId: string, courseTitle: string) => {
      if (!user) return;
      commitUsers((prev) =>
        prev.map((u) => {
          if (u.id !== user.id) return u;
          const already = u.scopedRoles.some(
            (g) => g.roleId === "course_owner" && g.resourceId === courseId
          );
          if (already) return u;
          return {
            ...u,
            scopedRoles: [
              ...u.scopedRoles,
              {
                roleId: "course_owner",
                resourceId: courseId,
                resourceLabel: courseTitle,
              },
            ],
          };
        })
      );
    },
    [user, commitUsers]
  );

  const removeScopedGrantsForCourse = useCallback(
    (courseId: string) => {
      commitUsers((prev) =>
        prev.map((u) =>
          u.scopedRoles.some((g) => g.resourceId === courseId)
            ? {
                ...u,
                scopedRoles: u.scopedRoles.filter(
                  (g) => g.resourceId !== courseId
                ),
              }
            : u
        )
      );
    },
    [commitUsers]
  );

  const removeUserScopedRole = useCallback(
    (
      userId: string,
      roleId: ScopedRoleGrant["roleId"],
      resourceId: string
    ) => {
      if (!canModifyTargetUser(user, userId, roles)) return;
      commitUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          return {
            ...u,
            scopedRoles: u.scopedRoles.filter(
              (g) => !(g.roleId === roleId && g.resourceId === resourceId)
            ),
          };
        })
      );
    },
    [user, roles, commitUsers]
  );

  const addUserInlinePolicy = useCallback(
    (userId: string, statement: PolicyStatement) => {
      if (!canModifyTargetUser(user, userId, roles)) return;
      // Cannot delegate user:self:modify unless the actor explicitly holds it themselves
      if (statementGrantsSelfModify(statement) && !canModifySelf(user, roles)) {
        return;
      }
      commitUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          return {
            ...u,
            inlinePolicies: [...(u.inlinePolicies ?? []), statement],
          };
        })
      );
    },
    [user, roles, commitUsers]
  );

  const removeUserInlinePolicy = useCallback(
    (userId: string, index: number) => {
      if (!canModifyTargetUser(user, userId, roles)) return;
      commitUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          const current = u.inlinePolicies ?? [];
          return {
            ...u,
            inlinePolicies: current.filter((_, i) => i !== index),
          };
        })
      );
    },
    [user, roles, commitUsers]
  );

  const setUserSuspended = useCallback(
    (userId: string, suspended: boolean, reason?: string) => {
      if (!canModifyTargetUser(user, userId, roles)) return;
      commitUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          const existingPolicies = (u.inlinePolicies ?? []).filter(
            (st) => st.sid !== "AccountSuspendedDenyAll"
          );
          if (suspended) {
            return {
              ...u,
              suspended: true,
              inlinePolicies: [
                ...existingPolicies,
                {
                  sid: "AccountSuspendedDenyAll",
                  effect: "Deny",
                  actions: ["*"],
                  resources: [arn.all()],
                },
              ],
              suspension: {
                reason:
                  reason?.trim() ||
                  "Suspended by an administrator via IAM User Management.",
                suspendedAt: new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                referenceId: `SN-SUSP-${Math.floor(1000 + Math.random() * 9000)}`,
                appealEmail: "appeals@shynotes.org",
              },
            };
          }
          return {
            ...u,
            suspended: false,
            inlinePolicies: existingPolicies,
            suspension: undefined,
          };
        })
      );
    },
    [user, roles, commitUsers]
  );

  const resetUsers = useCallback(() => {
    const defaults = createDefaultUsers();
    commitUsers(() => defaults, false);
    if (
      activeUserId !== "signed-out" &&
      !defaults.some((u) => u.id === activeUserId)
    ) {
      selectUser("usr_sam_04");
    }
  }, [commitUsers, activeUserId, selectUser]);

  // --- Role Registry Mutations (guarded by IAM + Self-Modify boundary) ---
  const createRole = useCallback(
    (role: Omit<GlobalRoleDefinition, "statements">) => {
      if (!evaluateCan(user, "iam:roles:manage", arn.iam("*"), roles)) return;
      commitRoles((prev) => {
        if (prev[role.id]) return prev;
        return {
          ...prev,
          [role.id]: { ...role, system: false, statements: [] },
        };
      });
    },
    [user, roles, commitRoles]
  );

  const deleteRole = useCallback(
    (roleId: string) => {
      if (!canModifyRole(user, roleId, roles)) return;
      commitRoles((prev) => {
        const target = prev[roleId];
        if (!target || target.system) return prev;
        const next = { ...prev };
        delete next[roleId];
        return next;
      });
      commitUsers((prev) =>
        prev.map((u) =>
          u.globalRoles.includes(roleId)
            ? {
                ...u,
                globalRoles: u.globalRoles.filter((r) => r !== roleId),
              }
            : u
        )
      );
    },
    [user, roles, commitRoles, commitUsers]
  );

  const addRoleStatement = useCallback(
    (roleId: string, statement: PolicyStatement) => {
      if (!canModifyRole(user, roleId, roles)) return;
      // Cannot add user:self:modify to any role unless the actor explicitly holds it themselves
      if (statementGrantsSelfModify(statement) && !canModifySelf(user, roles)) {
        return;
      }
      commitRoles((prev) => {
        const target = prev[roleId];
        if (!target) return prev;
        return {
          ...prev,
          [roleId]: {
            ...target,
            statements: [...target.statements, statement],
          },
        };
      });
    },
    [user, roles, commitRoles]
  );

  const removeRoleStatement = useCallback(
    (roleId: string, statementIndex: number) => {
      if (!canModifyRole(user, roleId, roles)) return;
      commitRoles((prev) => {
        const target = prev[roleId];
        if (!target) return prev;
        if (roleId === "role_super_admin" && target.statements.length <= 1) {
          return prev;
        }
        return {
          ...prev,
          [roleId]: {
            ...target,
            statements: target.statements.filter(
              (_, i) => i !== statementIndex
            ),
          },
        };
      });
    },
    [user, roles, commitRoles]
  );

  const resetRoles = useCallback(() => {
    commitRoles(() => cloneDefaultRoles(), false);
  }, [commitRoles]);

  const can = useCallback(
    (action: IamAction, resource: ResourceArn) =>
      evaluateCan(user, action, resource, roles),
    [user, roles]
  );

  const evaluate = useCallback(
    (action: IamAction, resource: ResourceArn) =>
      evaluatePolicy(user, action, resource, roles),
    [user, roles]
  );

  const hasAdminAccess = useMemo(
    () => hasAnyAdminAccess(user, roles),
    [user, roles]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        activeUserId,
        isHydrated,
        selectUser,
        signOut,
        can,
        evaluate,
        hasAdminAccess,
        canSelfModify,
        canEditUser,
        canEditRole,
        users,
        principals: users,
        hasCustomUsers,
        createUser,
        deleteUser,
        toggleUserGlobalRole,
        addUserScopedRole,
        setCourseRoleForUser,
        grantCourseOwnershipToCurrentUser,
        removeScopedGrantsForCourse,
        removeUserScopedRole,
        addUserInlinePolicy,
        removeUserInlinePolicy,
        setUserSuspended,
        resetUsers,
        roles,
        hasCustomRoles,
        createRole,
        deleteRole,
        addRoleStatement,
        removeRoleStatement,
        resetRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
