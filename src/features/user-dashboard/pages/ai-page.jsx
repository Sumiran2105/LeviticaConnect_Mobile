import { Bot, Lock, Sparkles } from "lucide-react";

import { UserLayout } from "@/layouts/user-layout";

export function AiPage() {
  return (
    <UserLayout
      contentClassName="!p-0 h-full overflow-hidden"
      contentInnerClassName="!m-0 h-full !w-full !max-w-none"
      showFloatingActions={false}
    >
      <div className="relative flex h-full min-h-0 w-full overflow-hidden border-t border-brand-line bg-white lg:border-t-0">
        <div className="absolute inset-0 blur-sm">
          <div className="flex h-full flex-col">
            <header className="flex shrink-0 items-center justify-between border-b border-brand-line bg-gradient-to-r from-brand-primary/5 to-transparent px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-primary shadow-md shadow-brand-primary/30">
                  <Sparkles className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-brand-ink">Levitica AI</h2>
                  <p className="text-xs font-medium text-brand-secondary">Preparing assistant workspace</p>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-hidden px-6 py-5">
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-primary to-[#34a87c] shadow-xl shadow-brand-primary/30">
                  <Sparkles className="size-8 text-white" />
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-24 rounded-2xl border border-brand-line bg-brand-neutral/60" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center bg-white/55 px-6 backdrop-blur-md">
          <div className="max-w-md rounded-3xl border border-brand-line bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(68,83,74,0.16)]">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-brand-soft text-brand-primary">
              <Lock className="size-7" />
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-neutral px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary">
              <Bot className="size-3.5" />
              Coming Soon
            </div>
            <h1 className="text-2xl font-bold text-brand-ink">AI will be unlocked later</h1>
            <p className="mt-3 text-sm leading-6 text-brand-secondary">
              This workspace is currently locked while we prepare the AI experience.
            </p>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
