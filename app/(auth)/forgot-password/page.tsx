import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Forgot Password (Stub)</h1>
      <p className="text-sm text-muted-foreground">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sagittis
        ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.
      </p>
      <div className="flex flex-wrap gap-4 pt-2 text-sm">
        <Link href="/login" className="underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
