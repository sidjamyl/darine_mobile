import { Chip } from "@/components/admin-ui";
import { adminModules, type AdminModuleHref } from "@/lib/admin-modules";

export function ModulePage({ href }: { href: AdminModuleHref }) {
  const module = adminModules.find((entry) => entry.href === href)!;

  return (
    <main className="module-page">
      <section className="module-hero">
        <Chip color="primary" variant="flat">Foundation ready</Chip>
        <h2>{module.label}</h2>
        <p>{module.description}</p>
      </section>
      <div className="module-grid">
        <section className="module-card">
          <div className="module-card-body">
            <h3>Shared layout</h3>
            <p className="muted">This module is wired into the protected admin shell and ready for its feature implementation issue.</p>
          </div>
        </section>
        <section className="module-card">
          <div className="module-card-body">
            <h3>tRPC backend</h3>
            <p className="muted">Admin authorization is validated through the shared tRPC backend before this page is shown.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
