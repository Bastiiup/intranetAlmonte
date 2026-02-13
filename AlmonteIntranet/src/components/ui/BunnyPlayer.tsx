'use client'

const BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '592474'
const EMBED_BASE = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}`

export interface BunnyPlayerProps {
  videoId: string
  title?: string
}

export default function BunnyPlayer({ videoId, title }: BunnyPlayerProps) {
  const embedUrl = `${EMBED_BASE}/${videoId}?autoplay=false&responsive=true`

  return (
    <div
      className="w-100 rounded overflow-hidden"
      style={{ aspectRatio: '16/9' }}
    >
      <iframe
        src={embedUrl}
        title={title ?? `Video ${videoId}`}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="w-100 h-100 border-0 rounded"
        style={{ aspectRatio: '16/9' }}
      />
    </div>
  )
}
