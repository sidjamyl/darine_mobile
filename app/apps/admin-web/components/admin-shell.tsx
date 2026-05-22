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
    return <main className="state-page">Chargement de la session...</main>;
  }

  if (!session?.user) {
    return <LoginCard />;
  }

  if (adminProbe.error) {
    return (
      <main className="state-page">
        <section className="state-card">
          <div className="state-card-body">
            <Chip color="danger" variant="flat">Acces refuse</Chip>
            <h1>Acces admin requis</h1>
            <p className="muted">Ce compte est connecte, mais il n'a pas les droits admin ou owner.</p>
            <Button
              color="primary"
              variant="flat"
              onPress={async () => {
                await authClient.signOut();
                await queryClient.invalidateQueries();
              }}
            >
              Deconnexion
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
            <span>Administration</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Modules admin">
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
            <p className="eyebrow">Espace protege</p>
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
              Deconnexion
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
