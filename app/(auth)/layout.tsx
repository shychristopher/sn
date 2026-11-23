import Link from "next/link";
import { AccessibilityTrigger } from "@/app/components/accessibility-trigger";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <nav
            aria-label="Auth navigation"
            className="flex flex-wrap gap-4 text-xs text-muted-foreground"
          >
            <Link href="/" className="underline-offset-4 hover:underline">
              Landing
            </Link>
            <Link href="/login" className="underline-offset-4 hover:underline">
              Login
            </Link>
            <Link
              href="/register"
              className="underline-offset-4 hover:underline"
            >
              Register
            </Link>
            <Link
              href="/forgot-password"
              className="underline-offset-4 hover:underline"
            >
              Forgot Password
            </Link>
          </nav>

          <AccessibilityTrigger compact />
        </div>

        <main>{children}</main>
      </div>
    </div>
  );
}
