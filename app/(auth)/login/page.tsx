"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type AuthUser } from "@/app/lib/auth-context";
import { hasAnyAdminAccess } from "@/app/lib/iam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { users, roles, selectUser } = useAuth();
  const router = useRouter();

  const handleStubSignIn = (target: AuthUser) => {
    selectUser(target.id);
    if (target.suspended) {
      router.push("/suspended");
    } else if (hasAnyAdminAccess(target, roles)) {
      router.push("/admin");
    } else {
      router.push("/app");
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Sign in to Shy Notes</h1>
        <p className="text-sm text-muted-foreground">
          Choose any user account from the live directory below to preview their
          attached IAM roles, scoped course grants, or suspension state.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <Button
            key={u.id}
            variant={u.suspended ? "destructive" : "outline"}
            onClick={() => handleStubSignIn(u)}
            className="h-auto justify-between gap-3 py-2.5 text-left"
          >
            <span className="min-w-0 truncate font-medium">{u.name}</span>
            <Badge
              variant={u.suspended ? "outline" : "secondary"}
              className="shrink-0 text-[10px]"
            >
              {u.roleSummary}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 pt-1 text-sm text-muted-foreground">
        <Link href="/register" className="underline hover:text-foreground">
          Create an account
        </Link>
        <Link
          href="/forgot-password"
          className="underline hover:text-foreground"
        >
          Forgot password
        </Link>
      </div>
    </div>
  );
}
