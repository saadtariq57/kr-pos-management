"use client";

import * as React from "react";

import type { AppNavItem } from "@/components/app-shell/nav";
import { appNav } from "@/components/app-shell/nav";
import { useAuth } from "@/components/auth/AuthProvider";
import { roleHasNavAccess } from "@/lib/rbac";

export function useVisibleAppNav(): AppNavItem[] {
  const { user } = useAuth();

  return React.useMemo(() => {
    if (!user?.role) return appNav;
    return appNav.filter((item) => roleHasNavAccess(user.role, item.key));
  }, [user]);
}
