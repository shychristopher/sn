import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Shy Notes — Landing Section
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button nativeButton={false} render={<Link href="/login" />}>
            Sign In
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/register" />}
          >
            Create Account
          </Button>
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-8">
        <h2 className="text-xl font-semibold">Placeholder Block</h2>
        <p className="max-w-2xl text-muted-foreground">
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
          proident, sunt in culpa qui officia deserunt mollit anim id est
          laborum.
        </p>
      </section>
    </div>
  );
}
