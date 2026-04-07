"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Smartphone, Store } from "lucide-react";
import { useTranslations } from "@/lib/locale-context";
import { SOMALI_REGIONS } from "@/lib/somali-regions";

/** KULMISCART hero art — filenames versioned so browsers/CDNs never show cached old slides. */
const HERO_SLIDES = [
  "/images/hero/kulmis-hero-01.png",
  "/images/hero/kulmis-hero-02.png",
  "/images/hero/kulmis-hero-03.png",
  "/images/hero/kulmis-hero-04.png",
  "/images/hero/kulmis-hero-05.png",
  "/images/hero/kulmis-hero-06.png",
  "/images/hero/kulmis-hero-07.png",
  "/images/hero/kulmis-hero-08.png",
  "/images/hero/kulmis-hero-09.png",
  "/images/hero/kulmis-hero-10.png",
  "/images/hero/kulmis-hero-11.png",
] as const;

const SLIDE_INTERVAL_MS = 4500;
/** Cycles through all official Somali regions (independent of hero images). */
const REGION_INTERVAL_MS = 3200;

export function HeroSection() {
  const { t } = useTranslations();
  const [active, setActive] = useState(0);
  const [regionIdx, setRegionIdx] = useState(0);

  const trustItems = [
    { icon: Store, label: t("hero.trust1") },
    { icon: MessageCircle, label: t("hero.trust2") },
    { icon: Smartphone, label: t("hero.trust3") },
  ] as const;

  const region = SOMALI_REGIONS[regionIdx]!;
  const regionDisplay = t(`hero.regions.${region}`);
  const liveLine = `${regionDisplay} · ${t("hero.liveSuffix")}`;

  const goTo = useCallback((i: number) => {
    setActive(((i % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % HERO_SLIDES.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setRegionIdx((i) => (i + 1) % SOMALI_REGIONS.length);
    }, REGION_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden bg-muted/60 pb-6 pt-6 dark:bg-slate-950/40 sm:pb-10 sm:pt-8 md:pb-12 md:pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-hero-gradient opacity-[0.18] dark:opacity-[0.12]" aria-hidden />
      <div
        className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-brand-primary/20 blur-3xl dark:bg-brand-primary/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-brand-secondary/15 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-brand px-4 sm:px-6">
        <div className="grid gap-8 rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-[#f9fcfe] to-slate-50/95 p-6 shadow-[0_28px_64px_-18px_rgba(15,23,42,0.1)] ring-1 ring-white/90 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:ring-slate-800 sm:gap-10 sm:p-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center md:gap-12 md:p-10 lg:p-12">
          <div>
            <span className="hero-rise inline-flex items-center rounded-full border border-brand-primary/25 bg-brand-primary/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-primary dark:border-brand-primary/40 dark:bg-brand-primary/10">
              {t("hero.badge")}
            </span>

            <h1 className="hero-rise hero-rise-delay-1 mt-5 text-balance text-[1.75rem] font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-[2.65rem] lg:text-[2.85rem]">
              {t("hero.title1")}
              <br />
              {t("hero.title2")}
              <br />
              <span className="bg-gradient-to-r from-brand-primary via-brand-primary to-brand-secondary bg-clip-text text-transparent">
                {t("hero.title3")}
              </span>
            </h1>

            <p className="hero-rise hero-rise-delay-2 mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
              {t("hero.subtitle")}
            </p>

            <div className="hero-rise hero-rise-delay-3 mt-8 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/auth?tab=store&mode=register" className="btn-brand-accent">
                {t("hero.ctaPrimary")}
              </Link>
              <Link href="/products" className="btn-brand-outline">
                {t("hero.ctaSecondary")}
              </Link>
            </div>

            <ul className="hero-rise hero-rise-delay-4 mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
              {trustItems.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20">
                    <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-rise hero-rise-delay-5 relative mx-auto w-full max-w-lg md:max-w-none">
            <div
              className="relative aspect-[5/4] overflow-hidden rounded-2xl shadow-2xl shadow-slate-900/12 ring-1 ring-slate-200/60 dark:ring-slate-700 sm:aspect-[4/3] md:aspect-auto md:min-h-[280px] lg:min-h-[300px]"
              role="region"
              aria-roledescription="carousel"
              aria-label={t("hero.imageAlt")}
            >
              {HERO_SLIDES.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt={`${t("hero.imageAlt")} — ${i + 1} / ${HERO_SLIDES.length}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  priority={i === 0}
                  className={`absolute inset-0 z-0 object-cover object-center transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
                    i === active ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden={i !== active}
                />
              ))}
              <div
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-slate-900/25 via-transparent to-slate-900/5"
                aria-hidden
              />
              <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex justify-center gap-2">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(i)}
                      className={`h-2 rounded-full transition-all duration-300 ease-in-out motion-reduce:transition-none ${
                        i === active ? "w-8 bg-white shadow-sm" : "w-2 bg-white/50 hover:bg-white/80"
                      }`}
                      aria-label={`${i + 1} / ${HERO_SLIDES.length}`}
                      aria-current={i === active}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/25 bg-white/92 px-4 py-3 shadow-lg backdrop-blur-md dark:border-slate-600/50 dark:bg-slate-900/90">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-secondary/70 opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-secondary ring-2 ring-white dark:ring-slate-900" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("hero.liveLabel")}
                    </p>
                    <p
                      key={regionIdx}
                      className="hero-region-line text-sm font-semibold text-slate-800 dark:text-slate-100"
                      aria-live="polite"
                    >
                      {liveLine}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
