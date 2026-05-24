import { AuthScaffold } from "@/components/auth/AuthScaffold";

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthScaffold>{children}</AuthScaffold>;
}
