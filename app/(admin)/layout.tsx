import { AdminWorkspaceShell } from "@/app/components/admin-workspace-shell";

export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminWorkspaceShell>{children}</AdminWorkspaceShell>;
}
