import { getProductVideoPresentation } from "@/lib/video-embed";

type Props = {
  url: string;
};

/** Renders YouTube/Vimeo in a sandboxed iframe or a direct file in HTML5 video. */
export function ProductVideo({ url }: Props) {
  const pres = getProductVideoPresentation(url);
  if (!pres) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        This video link is not supported. Use YouTube, Vimeo, or a direct HTTPS link to .mp4, .webm, or .mov.
      </div>
    );
  }

  if (pres.mode === "iframe") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-black">
        <p className="bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground dark:bg-slate-900">
          Product video
        </p>
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={pres.src}
            title={pres.title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black">
      <p className="bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground dark:bg-slate-900">
        Product video
      </p>
      <video
        src={pres.src}
        controls
        className="max-h-[min(360px,70vh)] w-full"
        preload="metadata"
        playsInline
      />
    </div>
  );
}
