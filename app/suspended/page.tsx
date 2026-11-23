"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut, Mail } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SuspendedPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  if (!user?.suspended) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Account in Good Standing</CardTitle>
            <CardDescription>
              This account is not currently suspended.
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-3">
            <Button nativeButton={false} render={<Link href="/" />}>
              Back to Landing
            </Button>
            {user && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/app" />}
              >
                Go to App
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  const suspension = user.suspension;

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="destructive" className="gap-1.5">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              Account Suspended
            </Badge>
            {suspension?.referenceId && (
              <span className="font-mono text-xs text-muted-foreground">
                Ref: {suspension.referenceId}
              </span>
            )}
          </div>
          <CardTitle className="text-xl">
            Your Shy Notes account has been suspended
          </CardTitle>
          <CardDescription>
            Signed in as <span className="font-medium text-foreground">{user.name}</span> ({user.email}).
            Access to courses, notes, and community features is paused while
            this suspension is active.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Reason for suspension
            </p>
            <p className="mt-1.5 text-sm text-foreground">
              {suspension?.reason ??
                "Violation of Shy Notes community and platform guidelines."}
            </p>
            {suspension?.suspendedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Effective date: {suspension.suspendedAt}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2.5">
            <h2 className="text-sm font-semibold text-foreground">
              How to appeal this decision
            </h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                Send an email to{" "}
                <span className="font-medium text-foreground">
                  {suspension?.appealEmail ?? "appeals@shynotes.org"}
                </span>{" "}
                from your registered account email address.
              </li>
              <li>
                Include your reference number (
                <span className="font-mono text-foreground">
                  {suspension?.referenceId ?? "SN-SUSP-0000"}
                </span>
                ) in the subject line.
              </li>
              <li>
                Briefly explain why you believe the suspension was made in error
                or what steps you&apos;ve taken to resolve the issue.
              </li>
              <li>
                A community moderator will review your appeal and follow up
                within 3–5 business days.
              </li>
            </ol>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={`mailto:${suspension?.appealEmail ?? "appeals@shynotes.org"}?subject=Account%20Suspension%20Appeal%20(${suspension?.referenceId ?? ""})`}
              />
            }
          >
            <Mail className="size-4" aria-hidden="true" />
            Email Appeal
          </Button>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
