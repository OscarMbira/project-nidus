import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const HOVER_ZOOM_SCALE = 1.5

/**
 * Thumbnail that enlarges on hover and opens a full-size lightbox on click.
 * Used on the Profile page for picture and signature previews (v894).
 */
export default function ZoomableImage({
  src,
  alt,
  imgClassName = '',
  className = '',
  hoverPreviewClassName = 'max-h-64 max-w-xs object-contain',
  hoverScale = HOVER_ZOOM_SCALE,
  priority = false,
}) {
  const [lightbox, setLightbox] = useState(false)
  const [hoverRect, setHoverRect] = useState(null)

  useEffect(() => {
    if (!lightbox) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setLightbox(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox])

  if (!src) return null

  const showHover = (element) => {
    if (!element) return
    setHoverRect(element.getBoundingClientRect())
  }

  const previewSize = hoverRect
    ? {
        width: hoverRect.width * hoverScale,
        height: hoverRect.height * hoverScale,
        maxWidth: 'none',
        maxHeight: 'none',
      }
    : null

  const hoverStyle = hoverRect
    ? (() => {
        const placeAbove = window.innerHeight - hoverRect.bottom < previewSize.height + 24
        return {
          left: hoverRect.left + hoverRect.width / 2,
          top: placeAbove ? hoverRect.top - 8 : hoverRect.bottom + 8,
          transform: placeAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)',
        }
      })()
    : null

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setHoverRect(null)
          setLightbox(true)
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          event.stopPropagation()
          setHoverRect(null)
          setLightbox(true)
        }}
        onMouseEnter={(event) => showHover(event.currentTarget)}
        onMouseLeave={() => setHoverRect(null)}
        onFocus={(event) => showHover(event.currentTarget)}
        onBlur={() => setHoverRect(null)}
        title="Hover or click to enlarge"
        aria-label={`Enlarge ${alt}`}
        className={`relative z-10 inline-flex shrink-0 cursor-zoom-in overflow-visible rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${className}`}
      >
        <img
          src={src}
          alt={alt}
          className={imgClassName}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
        />
      </span>
      {hoverRect && !lightbox && createPortal(
        <div
          data-testid="zoomable-hover-preview"
          className="pointer-events-none fixed z-[70] rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
          style={hoverStyle}
        >
          <img src={src} alt="" className={hoverPreviewClassName} style={previewSize} />
        </div>,
        document.body,
      )}
      {lightbox && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(false)}
        >
          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-[90vw] rounded-lg bg-white object-contain p-4 shadow-2xl dark:bg-gray-100"
            />
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-900 bg-gray-900 px-2.5 py-1.5 text-sm font-medium text-white shadow hover:bg-gray-800 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
