import { Suspense } from "react";
import { COURSES_CATALOG } from "@/app/lib/courses-data";
import { CourseWorkspace } from "@/app/components/course-workspace";

export function generateStaticParams() {
  return COURSES_CATALOG.map((course) => ({ slug: course.slug }));
}

export default function CourseViewPage(
  props: PageProps<"/app/courses/[slug]">
) {
  return (
    <Suspense fallback={<CourseWorkspaceSkeleton />}>
      <CourseLoader params={props.params} />
    </Suspense>
  );
}

async function CourseLoader({
  params,
}: {
  params: PageProps<"/app/courses/[slug]">["params"];
}) {
  const { slug } = await params;
  return <CourseWorkspace slug={slug} />;
}

function CourseWorkspaceSkeleton() {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="hidden h-[calc(100dvh-4rem-var(--dev-bar-height))] w-72 shrink-0 border-r border-border bg-surface/60 p-4 md:block">
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
