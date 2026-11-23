import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Register (Stub)</h1>
      <p className="text-sm text-muted-foreground">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nisi. Nulla
        quis sem at nibh elementum imperdiet.
      </p>
      <div className="flex flex-wrap gap-4 pt-2 text-sm">
        <Link href="/app" className="underline">
          Continue to App
        </Link>
        <Link href="/login" className="underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
