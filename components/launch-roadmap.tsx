"use client";

import { MessageCircle, Share2, ShoppingBag, Store, UserPlus } from "lucide-react";
import { useTranslations } from "@/lib/locale-context";

const stepIcons = [UserPlus, Store, ShoppingBag, Share2, MessageCircle] as const;

export function LaunchRoadmap() {
  const { t } = useTranslations();

  const steps = [
    t("roadmap.step1"),
    t("roadmap.step2"),
    t("roadmap.step3"),
    t("roadmap.step4"),
    t("roadmap.step5"),
  ];

  return (
    <section className="mx-auto w-full max-w-brand px-4 py-12 text-foreground sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">{t("roadmap.eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("roadmap.title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("roadmap.subtitle")}</p>
      </div>

      <div className="relative mt-14 hidden md:block">
        <div
          className="pointer-events-none absolute left-[8%] right-[8%] top-[1.75rem] h-[3px] rounded-full bg-gradient-to-r from-brand-primary/40 via-brand-primary to-brand-secondary shadow-sm"
          aria-hidden
        />
        <ol className="relative grid grid-cols-5 gap-2 lg:gap-3">
          {steps.map((label, i) => {
            const Icon = stepIcons[i]!;
            return (
              <li key={label} className="flex flex-col items-center text-center">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex size-14 items-center justify-center rounded-full border-[3px] border-background bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-bold text-white shadow-lg ring-2 ring-brand-primary/25">
                    <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="mt-4 rounded-2xl border border-border bg-card px-3 py-3 text-card-foreground shadow-md ring-1 ring-border/60">
                    <Icon className="mx-auto mb-2 size-5 text-brand-primary" aria-hidden />
                    <span className="block text-xs font-semibold leading-snug lg:text-[13px]">{label}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="relative mt-10 md:hidden">
        <div
          className="absolute bottom-4 left-[1.3125rem] top-4 w-[3px] rounded-full bg-gradient-to-b from-brand-primary via-brand-primary to-brand-secondary"
          aria-hidden
        />
        <ol className="relative space-y-0">
          {steps.map((label, i) => {
            const Icon = stepIcons[i]!;
            return (
              <li key={label} className="relative flex gap-4 pb-8 last:pb-0">
                <div className="relative z-10 flex shrink-0 flex-col items-center">
                  <div className="flex size-11 items-center justify-center rounded-full border-[3px] border-background bg-gradient-to-br from-brand-primary to-brand-secondary text-xs font-bold text-white shadow-md">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-card-foreground shadow-md">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-5 shrink-0 text-brand-primary" aria-hidden />
                    <span className="text-sm font-semibold leading-snug">{label}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
