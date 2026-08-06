'use client';

import { ExternalLink, Play, Video } from 'lucide-react';

interface VideoLinkCardProps {
  /** The video URL (YouTube or Vimeo) */
  url: string;
  /** Title of the video */
  title: string;
  /** Optional description */
  description?: string;
  /** Associated subject or reading */
  subject?: string;
  /** Provider name */
  provider?: string;
}

/**
 * Extracts a YouTube video ID from various URL formats.
 */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Gets a thumbnail URL for the video.
 * YouTube: uses direct image URL. Vimeo: uses vumbnail service.
 */
function getThumbnailUrl(url: string): string | null {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch?.[1]) {
    return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }
  return null;
}

/**
 * Determines the video platform from the URL.
 */
function getPlatform(url: string): 'YouTube' | 'Vimeo' | 'Unknown' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('vimeo.com')) return 'Vimeo';
  return 'Unknown';
}

export function VideoLinkCard({ url, title, description, subject, provider }: VideoLinkCardProps) {
  const thumbnailUrl = getThumbnailUrl(url);
  const platform = getPlatform(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-xl border p-4 transition-all duration-200 hover:border-[#C5A258]/50 hover:shadow-lg"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 w-32 h-20 rounded-lg overflow-hidden" style={{ background: 'var(--nav-hover-bg)' }}>
        {thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbnailUrl}
            alt={`Thumbnail for ${title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Video className="h-8 w-8 opacity-40" style={{ color: 'var(--foreground-secondary)' }} />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
            <Play className="h-4 w-4 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium truncate group-hover:text-[#C5A258] transition-colors" style={{ color: 'var(--foreground)' }}>
            {title}
          </h4>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground-secondary)' }} />
        </div>
        {description && (
          <p className="mt-1 text-xs line-clamp-2" style={{ color: 'var(--foreground-secondary)' }}>
            {description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}>
            {platform}
          </span>
          {subject && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
              {subject}
            </span>
          )}
          {provider && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
              {provider}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
