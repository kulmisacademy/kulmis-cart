"use client";

import type { Testimonial } from "@/lib/data";
import { useTranslations } from "@/lib/locale-context";

function initialsFromName(name: string): string {
  const parts = name.replace(/\./g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

type Props = {
  items: Testimonial[];
};

export function TestimonialsSection({ items }: Props) {
  const { t } = useTranslations();

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-brand px-4 pb-16 pt-4 sm:px-6 sm:pb-20">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">{t("testimonials.eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{t("testimonials.title")}</h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{t("testimonials.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {items.map((item) => (
          <figure
            key={item.name}
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-border/70 transition-all duration-300 ease-in-out hover:shadow-xl hover:ring-brand-primary/25 sm:p-7 sm:hover:scale-[1.02]"
          >
            <div
              className="pointer-events-none absolute -right-4 -top-2 font-serif text-[5.5rem] font-bold leading-none text-brand-primary/10 transition group-hover:text-brand-primary/15 dark:text-brand-primary/15"
              aria-hidden
            >
              &ldquo;
            </div>
            <div className="relative">
              <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary" />
              <blockquote>
                <p className="text-[1.05rem] leading-relaxed text-muted-foreground">{item.quote}</p>
              </blockquote>
            </div>
            <figcaption className="relative mt-8 flex items-center gap-4 border-t border-border pt-6">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-bold text-white shadow-inner"
                aria-hidden
              >
                {initialsFromName(item.name)}
              </span>
              <div>
                <cite className="not-italic text-base font-semibold text-foreground">{item.name}</cite>
                {item.role ? <p className="mt-0.5 text-sm text-muted-foreground">{item.role}</p> : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
