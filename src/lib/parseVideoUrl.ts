export type VideoType = "youtube" | "vimeo" | "upload" | "unknown";

export interface ParsedVideo {
  type: VideoType;
  embedUrl: string | null;
  videoId: string | null;
}

/**
 * Parse a video URL and return the embed URL.
 * Supports YouTube (watch?v=, youtu.be/, embed/, shorts/), Vimeo (vimeo.com/ID),
 * and direct file URLs (.mp4/.webm/.mov, or any URL stored in our bucket).
 */
export function parseVideoUrl(url: string | null | undefined): ParsedVideo {
  if (!url) return { type: "unknown", embedUrl: null, videoId: null };
  const trimmed = url.trim();
  if (!trimmed) return { type: "unknown", embedUrl: null, videoId: null };

  // YouTube
  const yt = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  if (yt?.[1]) {
    return {
      type: "youtube",
      videoId: yt[1],
      embedUrl: `https://www.youtube.com/embed/${yt[1]}`,
    };
  }

  // Vimeo
  const vm = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm?.[1]) {
    return {
      type: "vimeo",
      videoId: vm[1],
      embedUrl: `https://player.vimeo.com/video/${vm[1]}`,
    };
  }

  // Direct file (mp4/webm/mov) or storage URL
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(trimmed) || /supabase\.co\/storage/.test(trimmed)) {
    return { type: "upload", embedUrl: trimmed, videoId: null };
  }

  return { type: "unknown", embedUrl: null, videoId: null };
}
