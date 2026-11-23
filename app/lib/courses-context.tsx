"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/app/lib/auth-context";
import { arn, canManageCourseTarget } from "@/app/lib/iam";
import {
  DEFAULT_PAGE_BODY,
  DEFAULT_PAGE_SUMMARY,
  cloneStarterCourses,
  type CoursePublishStatus,
  type CourseRecord,
  type CourseTier,
} from "@/app/lib/courses-data";

const COURSES_STORAGE_KEY = "shynotes:courses:v1";
const ENROLLMENTS_STORAGE_KEY = "shynotes:enrollments:v1";

function slugifyCourse(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "untitled-course"
  );
}

function readStoredCourses(): CourseRecord[] | null {
  try {
    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(
      (c): c is CourseRecord =>
        Boolean(c) &&
        typeof c === "object" &&
        typeof (c as CourseRecord).id === "string" &&
        typeof (c as CourseRecord).slug === "string" &&
        typeof (c as CourseRecord).title === "string" &&
        Array.isArray((c as CourseRecord).modules)
    );
    return valid;
  } catch {
    return null;
  }
}

function readStoredEnrollments(): Record<string, string[]> | null {
  try {
    const raw = localStorage.getItem(ENROLLMENTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, string[]>;
  } catch {
    return null;
  }
}

export interface CreateCourseInput {
  title: string;
  summary: string;
  tags: string[];
  inviteCode?: string;
  tier?: CourseTier;
  publishStatus?: CoursePublishStatus;
}

export interface UpdateCourseInput {
  title?: string;
  summary?: string;
  tags?: string[];
  inviteCode?: string;
  tier?: CourseTier;
  publishStatus?: CoursePublishStatus;
  curatedTagIds?: string[];
}

export interface UpdatePageInput {
  title?: string;
  summary?: string;
  body?: string;
}

interface CoursesContextValue {
  courses: CourseRecord[];
  isHydrated: boolean;
  hasCustomCourses: boolean;
  getCourseBySlug: (slug: string) => CourseRecord | undefined;
  getCourseById: (id: string) => CourseRecord | undefined;

  // Enrollments per user
  enrolledCourseIds: string[];
  enrollInCourse: (courseId: string) => void;
  leaveCourse: (courseId: string) => void;
  getEnrolledUserIdsForCourse: (courseId: string) => string[];
  enrollUserInCourse: (courseId: string, targetUserId: string) => void;
  removeUserFromCourse: (courseId: string, targetUserId: string) => void;

  // Course CRUD
  createCourse: (input: CreateCourseInput) => CourseRecord | null;
  updateCourse: (courseId: string, patch: UpdateCourseInput) => void;
  deleteCourse: (courseId: string) => void;
  toggleCuratedTag: (courseId: string, tagId: string) => void;
  resetCourses: () => void;

  // Syllabus & Page CRUD
  addModule: (courseId: string, title: string) => { moduleId: string; firstPageId: string } | null;
  deleteModule: (courseId: string, moduleId: string) => void;
  addPage: (
    courseId: string,
    moduleId: string,
    title: string,
    parentPageId?: string
  ) => string | null;
  updatePage: (courseId: string, pageId: string, patch: UpdatePageInput) => void;
  deletePage: (courseId: string, pageId: string) => void;
}

const CoursesContext = createContext<CoursesContextValue | null>(null);

export function useCourses() {
  const ctx = useContext(CoursesContext);
  if (!ctx) {
    throw new Error("useCourses must be used within CoursesProvider");
  }
  return ctx;
}

export function CoursesProvider({ children }: { children: ReactNode }) {
  const {
    user,
    users,
    roles,
    can,
    grantCourseOwnershipToCurrentUser,
    removeScopedGrantsForCourse,
  } = useAuth();

  const [courses, setCourses] = useState<CourseRecord[]>(() =>
    cloneStarterCourses()
  );
  const [hasCustomCourses, setHasCustomCourses] = useState(false);
  const [enrollmentsByUser, setEnrollmentsByUser] = useState<
    Record<string, string[]>
  >({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedCourses = readStoredCourses();
      const storedEnrollments = readStoredEnrollments();
      queueMicrotask(() => {
        if (storedCourses !== null) {
          setCourses(storedCourses);
          setHasCustomCourses(true);
        }
        if (storedEnrollments) {
          setEnrollmentsByUser(storedEnrollments);
        }
        setIsHydrated(true);
      });
      return;
    } catch {
      // ignore storage errors
    }
    queueMicrotask(() => setIsHydrated(true));
  }, []);

  const commitCourses = useCallback(
    (updater: (prev: CourseRecord[]) => CourseRecord[], markCustom = true) => {
      setCourses((prev) => {
        const next = updater(prev);
        try {
          if (markCustom) {
            localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(next));
          } else {
            localStorage.removeItem(COURSES_STORAGE_KEY);
          }
        } catch {
          // ignore storage errors
        }
        return next;
      });
      setHasCustomCourses(markCustom);
    },
    []
  );

  const commitEnrollments = useCallback(
    (
      updater: (prev: Record<string, string[]>) => Record<string, string[]>
    ) => {
      setEnrollmentsByUser((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(ENROLLMENTS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    },
    []
  );

  const defaultEnrolledIds = courses
    .filter((c) => c.enrolledByDefault)
    .map((c) => c.id);

  const enrolledCourseIds = user
    ? (enrollmentsByUser[user.id] ?? defaultEnrolledIds)
    : [];

  const enrollInCourse = useCallback(
    (courseId: string) => {
      if (!user) return;
      commitEnrollments((prev) => {
        const current = prev[user.id] ?? defaultEnrolledIds;
        if (current.includes(courseId)) return prev;
        return { ...prev, [user.id]: [...current, courseId] };
      });
    },
    [user, defaultEnrolledIds, commitEnrollments]
  );

  const leaveCourse = useCallback(
    (courseId: string) => {
      if (!user) return;
      commitEnrollments((prev) => {
        const current = prev[user.id] ?? defaultEnrolledIds;
        return {
          ...prev,
          [user.id]: current.filter((id) => id !== courseId),
        };
      });
    },
    [user, defaultEnrolledIds, commitEnrollments]
  );

  const getEnrolledUserIdsForCourse = useCallback(
    (courseId: string): string[] => {
      const targetCourse = courses.find((c) => c.id === courseId);
      const enrolled: string[] = [];
      for (const u of users) {
        const userList = enrollmentsByUser[u.id] ?? defaultEnrolledIds;
        const hasScoped = u.scopedRoles.some((g) => g.resourceId === courseId);
        const isCreator = targetCourse?.createdByUserId === u.id;
        if (userList.includes(courseId) || hasScoped || isCreator) {
          enrolled.push(u.id);
        }
      }
      return enrolled;
    },
    [courses, users, enrollmentsByUser, defaultEnrolledIds]
  );

  const enrollUserInCourse = useCallback(
    (courseId: string, targetUserId: string) => {
      const courseArn = arn.course(courseId);
      if (
        !can("course:members:manage", courseArn) &&
        !can("course:settings:manage", courseArn)
      ) {
        return;
      }
      commitEnrollments((prev) => {
        const current = prev[targetUserId] ?? defaultEnrolledIds;
        if (current.includes(courseId)) return prev;
        return { ...prev, [targetUserId]: [...current, courseId] };
      });
    },
    [can, defaultEnrolledIds, commitEnrollments]
  );

  const removeUserFromCourse = useCallback(
    (courseId: string, targetUserId: string) => {
      const targetUser = users.find((u) => u.id === targetUserId);
      if (!targetUser) return;
      if (!canManageCourseTarget(user, courseId, targetUser, roles)) {
        return;
      }
      commitEnrollments((prev) => {
        const current = prev[targetUserId] ?? defaultEnrolledIds;
        return {
          ...prev,
          [targetUserId]: current.filter((id) => id !== courseId),
        };
      });
    },
    [user, users, roles, defaultEnrolledIds, commitEnrollments]
  );

  const getCourseBySlug = useCallback(
    (slug: string) => courses.find((c) => c.slug === slug),
    [courses]
  );

  const getCourseById = useCallback(
    (id: string) => courses.find((c) => c.id === id),
    [courses]
  );

  const createCourse = useCallback(
    (input: CreateCourseInput): CourseRecord | null => {
      if (!user || !can("course:create", arn.course("*"))) return null;
      const title = input.title.trim();
      if (!title) return null;

      const suffix = Date.now().toString(36).slice(-4);
      const baseSlug = slugifyCourse(title);
      const slugTaken = courses.some((c) => c.slug === baseSlug);
      const slug = slugTaken ? `${baseSlug}-${suffix}` : baseSlug;
      const id = `crs_${baseSlug.replace(/-/g, "_").slice(0, 14)}_${suffix}`;

      const canDirectPublish = can("course:review:approve", arn.course("*"));
      const publishStatus: CoursePublishStatus =
        input.publishStatus === "published" && canDirectPublish
          ? "published"
          : input.publishStatus === "pending-review"
            ? "pending-review"
            : "draft";

      const todayIso = new Date().toISOString().slice(0, 10);
      const created: CourseRecord = {
        id,
        slug,
        title,
        summary:
          input.summary.trim() ||
          "Community study notes and structured learning modules.",
        tier: input.tier ?? "other",
        publishStatus,
        tags: input.tags.length > 0 ? input.tags : ["Accessibility"],
        curatedTagIds: [],
        createdByUserId: user.id,
        updatedAt: todayIso,
        updatedLabel: "Created just now",
        enrolledCount: 1,
        enrolledByDefault: false,
        progressPercent: 0,
        pendingSuggestions: 0,
        inviteCode: input.inviteCode?.trim().toUpperCase() || undefined,
        modules: [
          {
            id: `mod-${suffix}-1`,
            title: "Module 1: Getting Started",
            pages: [
              {
                id: `p-${suffix}-1`,
                title: "1.1 Introduction",
                status: "not-started",
                summary: DEFAULT_PAGE_SUMMARY,
                body: DEFAULT_PAGE_BODY,
              },
            ],
          },
        ],
      };

      commitCourses((prev) => [created, ...prev]);
      grantCourseOwnershipToCurrentUser(created.id, created.title);
      enrollInCourse(created.id);
      return created;
    },
    [
      user,
      can,
      courses,
      commitCourses,
      grantCourseOwnershipToCurrentUser,
      enrollInCourse,
    ]
  );

  const updateCourse = useCallback(
    (courseId: string, patch: UpdateCourseInput) => {
      const courseArn = arn.course(courseId);
      const canEdit =
        can("course:edit", courseArn) ||
        can("course:settings:manage", courseArn) ||
        can("course:publish:submit", courseArn) ||
        can("course:review:approve", courseArn) ||
        can("course:review:deny", courseArn);
      if (!canEdit) return;

      const todayIso = new Date().toISOString().slice(0, 10);
      commitCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            ...patch,
            updatedAt: todayIso,
            updatedLabel: "Updated just now",
          };
        })
      );
    },
    [can, commitCourses]
  );

  const toggleCuratedTag = useCallback(
    (courseId: string, tagId: string) => {
      if (!can("tag:apply", arn.tag(tagId))) return;
      commitCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          const current = c.curatedTagIds ?? [];
          const nextTags = current.includes(tagId)
            ? current.filter((t) => t !== tagId)
            : [...current, tagId];
          return { ...c, curatedTagIds: nextTags };
        })
      );
    },
    [can, commitCourses]
  );

  const deleteCourse = useCallback(
    (courseId: string) => {
      if (!can("course:delete", arn.course(courseId))) return;
      commitCourses((prev) => prev.filter((c) => c.id !== courseId));
      removeScopedGrantsForCourse(courseId);
      commitEnrollments((prev) => {
        const next: Record<string, string[]> = {};
        for (const [uid, list] of Object.entries(prev)) {
          next[uid] = list.filter((id) => id !== courseId);
        }
        return next;
      });
    },
    [can, commitCourses, removeScopedGrantsForCourse, commitEnrollments]
  );

  const addModule = useCallback(
    (courseId: string, title: string) => {
      if (!can("course:edit", arn.course(courseId))) return null;
      const clean = title.trim();
      if (!clean) return null;
      const stamp = Date.now().toString(36);
      const moduleId = `mod-${stamp}`;
      const firstPageId = `p-${stamp}-1`;
      const todayIso = new Date().toISOString().slice(0, 10);

      commitCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                updatedAt: todayIso,
                updatedLabel: "Updated just now",
                modules: [
                  ...c.modules,
                  {
                    id: moduleId,
                    title: clean,
                    pages: [
                      {
                        id: firstPageId,
                        title: "Overview",
                        status: "not-started",
                        summary: DEFAULT_PAGE_SUMMARY,
                        body: DEFAULT_PAGE_BODY,
                      },
                    ],
                  },
                ],
              }
            : c
        )
      );
      return { moduleId, firstPageId };
    },
    [can, commitCourses]
  );

  const deleteModule = useCallback(
    (courseId: string, moduleId: string) => {
      if (!can("course:edit", arn.course(courseId))) return;
      commitCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId || c.modules.length <= 1) return c;
          return {
            ...c,
            updatedLabel: "Updated just now",
            modules: c.modules.filter((m) => m.id !== moduleId),
          };
        })
      );
    },
    [can, commitCourses]
  );

  const addPage = useCallback(
    (
      courseId: string,
      moduleId: string,
      title: string,
      parentPageId?: string
    ) => {
      if (!can("course:edit", arn.course(courseId))) return null;
      const clean = title.trim();
      if (!clean) return null;
      const newPageId = `p-${Date.now().toString(36)}`;
      const newPage = {
        id: newPageId,
        title: clean,
        status: "not-started" as const,
        summary: DEFAULT_PAGE_SUMMARY,
        body: DEFAULT_PAGE_BODY,
      };
      const todayIso = new Date().toISOString().slice(0, 10);

      commitCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            updatedAt: todayIso,
            updatedLabel: "Updated just now",
            modules: c.modules.map((m) => {
              if (m.id !== moduleId) return m;
              if (!parentPageId) {
                return { ...m, pages: [...m.pages, newPage] };
              }
              return {
                ...m,
                pages: m.pages.map((p) =>
                  p.id === parentPageId
                    ? { ...p, subpages: [...(p.subpages ?? []), newPage] }
                    : p
                ),
              };
            }),
          };
        })
      );
      return newPageId;
    },
    [can, commitCourses]
  );

  const updatePage = useCallback(
    (courseId: string, pageId: string, patch: UpdatePageInput) => {
      if (!can("course:edit", arn.course(courseId))) return;
      const todayIso = new Date().toISOString().slice(0, 10);

      commitCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            updatedAt: todayIso,
            updatedLabel: "Updated just now",
            modules: c.modules.map((m) => ({
              ...m,
              pages: m.pages.map((p) => {
                if (p.id === pageId) {
                  return { ...p, ...patch };
                }
                if (p.subpages) {
                  return {
                    ...p,
                    subpages: p.subpages.map((sub) =>
                      sub.id === pageId ? { ...sub, ...patch } : sub
                    ),
                  };
                }
                return p;
              }),
            })),
          };
        })
      );
    },
    [can, commitCourses]
  );

  const deletePage = useCallback(
    (courseId: string, pageId: string) => {
      if (!can("course:edit", arn.course(courseId))) return;
      commitCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          // Ensure the course always keeps at least 1 page
          const total = c.modules.reduce(
            (sum, m) =>
              sum +
              m.pages.reduce(
                (ps, p) => ps + 1 + (p.subpages?.length ?? 0),
                0
              ),
            0
          );
          if (total <= 1) return c;

          return {
            ...c,
            updatedLabel: "Updated just now",
            modules: c.modules.map((m) => ({
              ...m,
              pages: m.pages
                .filter((p) => p.id !== pageId)
                .map((p) =>
                  p.subpages
                    ? {
                        ...p,
                        subpages: p.subpages.filter((s) => s.id !== pageId),
                      }
                    : p
                ),
            })),
          };
        })
      );
    },
    [can, commitCourses]
  );

  const resetCourses = useCallback(() => {
    commitCourses(() => cloneStarterCourses(), false);
    try {
      localStorage.removeItem(ENROLLMENTS_STORAGE_KEY);
    } catch {
      // ignore
    }
    setEnrollmentsByUser({});
  }, [commitCourses]);

  return (
    <CoursesContext.Provider
      value={{
        courses,
        isHydrated,
        hasCustomCourses,
        getCourseBySlug,
        getCourseById,
        enrolledCourseIds,
        enrollInCourse,
        leaveCourse,
        getEnrolledUserIdsForCourse,
        enrollUserInCourse,
        removeUserFromCourse,
        createCourse,
        updateCourse,
        deleteCourse,
        toggleCuratedTag,
        resetCourses,
        addModule,
        deleteModule,
        addPage,
        updatePage,
        deletePage,
      }}
    >
      {children}
    </CoursesContext.Provider>
  );
}
