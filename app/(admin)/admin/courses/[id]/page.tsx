import { Suspense } from "react";
import { COURSES_CATALOG } from "@/app/lib/courses-data";
import { AdminCourseProfile } from "@/app/components/admin-course-profile";

export function generateStaticParams() {
  return COURSES_CATALOG.map((course) => ({ id: course.id }));
}

export default function AdminCourseProfilePage(
  props: PageProps<"/admin/courses/[id]">
) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 py-6">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-44 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      }
    >
      <AdminCourseLoader params={props.params} />
    </Suspense>
  );
}

async function AdminCourseLoader({
  params,
}: {
  params: PageProps<"/admin/courses/[id]">["params"];
}) {
  const { id } = await params;
  return <AdminCourseProfile courseId={id} />;
}
