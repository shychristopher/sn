"use client";

import { useRouter } from "next/navigation";
import { useAuth, type ActiveSessionId } from "@/app/lib/auth-context";
import { Button } from "@/components/ui/button";

/**
 * Slim sticky top bar for switching live IAM user sessions during development.
 * Dynamically reflects users created or edited in /admin/users (persisted in localStorage).
 * Marked `.no-print` so it never appears in print preview or printed output.
 */
export function AuthDevSwitcher() {
  const { users, activeUserId, selectUser } = useAuth();
  const router = useRouter();

  const handleSelect = (nextId: ActiveSessionId) => {
    const prevUser = users.find((u) => u.id === activeUserId);
    const nextUser =
      nextId === "signed-out"
        ? null
        : (users.find((u) => u.id === nextId) ?? null);

    selectUser(nextId);

    if (!nextUser) {
      router.push("/");
    } else if (nextUser.suspended) {
      router.push("/suspended");
    } else if (activeUserId === "signed-out" || prevUser?.suspended) {
      router.push("/app");
    }
  };

  return (
    <aside
      aria-label="Preview as user"
      className="no-print sticky top-0 z-50 flex min-h-(--dev-bar-height) w-full flex-wrap items-center justify-center gap-1 border-b border-border bg-muted/95 px-3 py-1 backdrop-blur-sm"
    >
      <span className="mr-1 font-mono text-[11px] font-medium text-muted-foreground">
        Preview user:
      </span>

      <Button
        size="xs"
        variant={activeUserId === "signed-out" ? "default" : "ghost"}
        onClick={() => handleSelect("signed-out")}
        aria-pressed={activeUserId === "signed-out"}
        title="Unauthenticated guest"
      >
        Signed out
      </Button>

      {users.map((u) => {
        const active = activeUserId === u.id;
        const hint = [
          u.roleSummary,
          u.globalRoles.length > 0 ? `global: ${u.globalRoles.join(", ")}` : "",
          u.scopedRoles.length > 0
            ? `scoped: ${u.scopedRoles.map((g) => `${g.roleId}@${g.resourceId}`).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <Button
            key={u.id}
            size="xs"
            variant={active ? "default" : "ghost"}
            onClick={() => handleSelect(u.id)}
            aria-pressed={active}
            title={hint}
            className="gap-1.5"
          >
            <span
              aria-hidden="true"
              className={
                u.suspended
                  ? "size-1.5 rounded-full bg-destructive"
                  : active
                    ? "size-1.5 rounded-full bg-primary-foreground"
                    : "size-1.5 rounded-full bg-emerald-500"
              }
            />
            <span>{u.name}</span>
          </Button>
        );
      })}
    </aside>
  );
}
