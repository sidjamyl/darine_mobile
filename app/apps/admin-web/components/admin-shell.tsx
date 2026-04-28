"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";

import { Button, Chip } from "@/components/admin-ui";
import { LoginCard } from "@/components/login-card";
import { adminModules } from "@/lib/admin-modules";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/lib/trpc";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const adminProbe = useQuery({
    ...trpc.adminUsers.list.queryOptions(),
    enabled: !!session?.user,
    retry: false,
  });

  if (isSessionPending) {
    return <main className="state-page">Loading admin session...</main>;
  }

  if (!session?.user) {
    return <LoginCard />;
  }

  if (adminProbe.error) {
    return (
      <main className="state-page">
        <section className="state-card">
          <div className="state-card-body">
            <Chip color="danger" variant="flat">Access denied</Chip>
            <h1>Admin access required</h1>
            <p className="muted">This account is signed in but does not have admin or owner permissions.</p>
            <Button
              color="primary"
              variant="flat"
              onPress={async () => {
                await authClient.signOut();
                await queryClient.invalidateQueries();
              }}
            >
              Sign out
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">J</div>
          <div>
            <strong>Joumla</strong>
            <span>Admin web</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Admin modules">
          {adminModules.map((module) => {
            const isActive = module.href === "/" ? pathname === "/" : pathname.startsWith(module.href);
            return (
              <Link key={module.href} href={module.href} className={isActive ? "nav-link active" : "nav-link"}>
                {module.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Protected back-office</p>
            <h1>Joumla Store</h1>
          </div>
          <div className="topbar-account">
            <span>{session.user.name}</span>
            <Button
              size="sm"
              variant="flat"
              onPress={async () => {
                await authClient.signOut();
                await queryClient.invalidateQueries();
              }}
            >
              Sign out
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
