import { parseVideoUrl } from "@/lib/parseVideoUrl";
import { cn } from "@/lib/utils";

interface CareersVideoSectionProps {
  url: string | null | undefined;
  title?: string | null;
  primaryColor?: string;
  className?: string;
}

export function CareersVideoSection({ url, title, primaryColor, className }: CareersVideoSectionProps) {
  const parsed = parseVideoUrl(url);
  if (!parsed.embedUrl) return null;

  return (
    <section className={cn("py-10 bg-muted/30", className)}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-center" style={{ color: primaryColor }}>
            {title}
          </h2>
        )}
        <div className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg bg-black aspect-video">
          {parsed.type === "upload" ? (
            <video
              src={parsed.embedUrl}
              controls
              preload="metadata"
              className="w-full h-full"
            />
          ) : (
            <iframe
              src={parsed.embedUrl}
              title={title || "Vídeo de apresentação"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </section>
  );
}
