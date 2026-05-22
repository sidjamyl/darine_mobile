import { Chip } from "@/components/admin-ui";
import { adminModules, type AdminModuleHref } from "@/lib/admin-modules";

export function ModulePage({ href }: { href: AdminModuleHref }) {
  const module = adminModules.find((entry) => entry.href === href)!;

  return (
    <main className="module-page">
      <section className="module-hero">
        <Chip color="primary" variant="flat">Module pret</Chip>
        <h2>{module.label}</h2>
        <p>{module.description}</p>
      </section>
      <div className="module-grid">
        <section className="module-card">
          <div className="module-card-body">
            <h3>Interface protegee</h3>
            <p className="muted">Ce module utilise la navigation admin et les droits back-office.</p>
          </div>
        </section>
        <section className="module-card">
          <div className="module-card-body">
            <h3>Backend tRPC</h3>
            <p className="muted">L'autorisation admin est verifiee avant l'affichage.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
