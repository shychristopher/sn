export type CourseTier = "featured" | "popular" | "other";
export type PageReviewStatus = "reviewed" | "in-progress" | "not-started";
export type CoursePublishStatus = "published" | "pending-review" | "draft";

export interface CourseTagDefinition {
  id: string; // immutable ID used in ARNs: sn:tag:<id>
  label: string;
  restricted: boolean; // requires curated tag ARN (e.g. sn:tag:tag_curated_recommended)
}

export const COURSE_TAGS_CATALOG: CourseTagDefinition[] = [
  { id: "tag_curated_recommended", label: "Recommended", restricted: true },
  { id: "tag_curated_staff_pick", label: "Staff Pick", restricted: true },
  { id: "tag_topic_accessibility", label: "Accessibility", restricted: false },
  { id: "tag_topic_html", label: "HTML", restricted: false },
  { id: "tag_topic_design", label: "Design", restricted: false },
  { id: "tag_topic_math", label: "Math", restricted: false },
  { id: "tag_topic_science", label: "Science", restricted: false },
  { id: "tag_topic_open_source", label: "Open Source", restricted: false },
  { id: "tag_topic_git", label: "Git", restricted: false },
  {
    id: "tag_topic_computer_science",
    label: "Computer Science",
    restricted: false,
  },
  { id: "tag_topic_biology", label: "Biology", restricted: false },
];

export const STANDARD_TOPIC_TAGS: string[] = COURSE_TAGS_CATALOG.filter(
  (t) => !t.restricted
).map((t) => t.label);

export interface CoursePageNode {
  id: string;
  title: string;
  status: PageReviewStatus;
  summary?: string;
  body?: string; // Plain text / paragraphs separated by blank lines
  subpages?: CoursePageNode[];
}

export interface CourseModule {
  id: string;
  title: string;
  pages: CoursePageNode[];
}

export interface CourseRecord {
  id: string; // immutable resource ID for IAM ARNs (sn:course:<id>)
  slug: string; // human-readable URL slug
  title: string;
  summary: string;
  tier: CourseTier;
  publishStatus: CoursePublishStatus;
  tags: string[];
  curatedTagIds: string[]; // immutable tag IDs applied by curators
  createdByUserId?: string;
  updatedAt: string; // ISO date for sorting
  updatedLabel: string;
  enrolledCount: number;
  enrolledByDefault: boolean;
  progressPercent: number;
  pendingSuggestions: number;
  inviteCode?: string;
  modules: CourseModule[];
}

export const DEFAULT_PAGE_SUMMARY =
  "Key concepts, structured study notes, and quick review prompts for this lesson.";

export const DEFAULT_PAGE_BODY = [
  "Use clear headings, short paragraphs, and concrete examples so learners can scan and review concepts comfortably.",
  "If you hold course:edit on this course ARN, click the edit pencil next to the page title to update the title, summary, or lesson notes directly.",
  "Everything you edit here is saved in localStorage and works seamlessly with Print Preview, Bionic Reading, and Read Aloud.",
].join("\n\n");

function buildStarterSyllabus(): CourseModule[] {
  return [
    {
      id: "mod-1",
      title: "Module 1: Foundations",
      pages: [
        {
          id: "p-1-1",
          title: "1.1 Welcome & Course Structure",
          status: "reviewed",
          summary:
            "How these study notes are organized and how to get the most out of each section.",
          body: [
            "Welcome to this course! Each module breaks a larger topic into short, printable, distraction-free pages you can review at your own pace.",
            "Click the status button in the top-right corner of any page to track whether you have reviewed it, are in progress, or have not started yet.",
          ].join("\n\n"),
        },
        {
          id: "p-1-2",
          title: "1.2 Core Concepts & Vocabulary",
          status: "reviewed",
          summary:
            "Essential terminology and mental models referenced throughout the rest of the course.",
          body: DEFAULT_PAGE_BODY,
          subpages: [
            {
              id: "p-1-2-a",
              title: "1.2.1 Reading Conventions",
              status: "reviewed",
              summary: "Notation and formatting used across worked examples.",
              body: DEFAULT_PAGE_BODY,
            },
            {
              id: "p-1-2-b",
              title: "1.2.2 Worked Walkthrough",
              status: "in-progress",
              summary: "Step-by-step walkthrough applying the core vocabulary.",
              body: DEFAULT_PAGE_BODY,
            },
          ],
        },
      ],
    },
    {
      id: "mod-2",
      title: "Module 2: Applied Practice",
      pages: [
        {
          id: "p-2-1",
          title: "2.1 Patterns & Tradeoffs",
          status: "not-started",
          summary:
            "Comparing practical approaches and spotting common pitfalls early.",
          body: DEFAULT_PAGE_BODY,
        },
        {
          id: "p-2-2",
          title: "2.2 Checkpoint Review",
          status: "not-started",
          summary:
            "Self-check prompts to verify retention before moving forward.",
          body: DEFAULT_PAGE_BODY,
        },
      ],
    },
  ];
}

/**
 * Concise 4-course starter seed (kept lean intentionally; full CRUD persisted in localStorage).
 */
export const COURSES_CATALOG: CourseRecord[] = [
  {
    id: "crs_web_a11y",
    slug: "sample-course",
    title: "Accessible Web Foundations",
    summary:
      "Semantic HTML landmarks, keyboard navigation, color contrast, and calm readable layouts built for every learner.",
    tier: "featured",
    publishStatus: "published",
    tags: ["Accessibility", "HTML", "Design"],
    curatedTagIds: ["tag_curated_recommended"],
    createdByUserId: "usr_alex_01",
    updatedAt: "2026-11-20",
    updatedLabel: "Updated 2 days ago",
    enrolledCount: 1420,
    enrolledByDefault: true,
    progressPercent: 50,
    pendingSuggestions: 2,
    inviteCode: "SHY-101",
    modules: buildStarterSyllabus(),
  },
  {
    id: "crs_lin_alg",
    slug: "another-course",
    title: "Linear Algebra Study Notes",
    summary:
      "Visual intuition for vectors, basis changes, eigenvalues, and matrix transformations.",
    tier: "featured",
    publishStatus: "published",
    tags: ["Math", "Science"],
    curatedTagIds: [],
    createdByUserId: "usr_morgan_02",
    updatedAt: "2026-11-18",
    updatedLabel: "Updated 4 days ago",
    enrolledCount: 1185,
    enrolledByDefault: true,
    progressPercent: 62,
    pendingSuggestions: 1,
    inviteCode: "MATH-202",
    modules: buildStarterSyllabus(),
  },
  {
    id: "crs_oss_git",
    slug: "open-source-handbook",
    title: "Open Source & Git Collaboration",
    summary:
      "Welcoming study notes for branching, pull requests, issue triage, and maintaining community repositories.",
    tier: "popular",
    publishStatus: "published",
    tags: ["Open Source", "Git"],
    curatedTagIds: ["tag_curated_recommended"],
    updatedAt: "2026-11-21",
    updatedLabel: "Updated yesterday",
    enrolledCount: 980,
    enrolledByDefault: false,
    progressPercent: 0,
    pendingSuggestions: 0,
    inviteCode: "OSS-300",
    modules: buildStarterSyllabus(),
  },
  {
    id: "crs_cell_bio",
    slug: "cellular-biology-notes",
    title: "Foundations of Cellular Biology",
    summary:
      "Membranes, organelles, cellular respiration, and genetic expression—currently awaiting publication review.",
    tier: "other",
    publishStatus: "pending-review",
    tags: ["Science", "Biology"],
    curatedTagIds: [],
    createdByUserId: "usr_alex_01",
    updatedAt: "2026-11-22",
    updatedLabel: "Submitted today",
    enrolledCount: 12,
    enrolledByDefault: false,
    progressPercent: 0,
    pendingSuggestions: 0,
    inviteCode: "BIO-101",
    modules: buildStarterSyllabus(),
  },
];

export const ALL_COURSE_TAGS = Array.from(
  new Set(COURSES_CATALOG.flatMap((c) => c.tags))
).sort();

export function cloneStarterCourses(): CourseRecord[] {
  return structuredClone(COURSES_CATALOG);
}

export function flattenCoursePages(modules: CourseModule[]): CoursePageNode[] {
  const flat: CoursePageNode[] = [];
  for (const mod of modules) {
    for (const page of mod.pages) {
      flat.push(page);
      if (page.subpages) {
        flat.push(...page.subpages);
      }
    }
  }
  return flat;
}
