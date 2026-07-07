import { UserLayout } from "@/layouts/user-layout";

export function UserPlaceholderPage({ title, description }) {
  return (
    <UserLayout>
      <section className="rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.08)] sm:p-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-secondary">
            User Module
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">{title}</h1>
          <p className="max-w-2xl text-sm leading-7 text-brand-secondary">{description}</p>
        </div>
      </section>
    </UserLayout>
  );
}
