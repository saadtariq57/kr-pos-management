import { redirect } from "next/navigation";

import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { getSessionUserAny } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUserAny();
  if (session) {
    redirect("/pos");
  }

  return <AuthScaffold>{children}</AuthScaffold>;
}
