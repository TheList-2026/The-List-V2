
'use client'

import { AnimatePresence, animate, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Place } from '@/lib/places'
import { OutroSlide } from './outro-slide'
import { PlaceSlide } from './place-slide'
import { TitleSlide } from './title-slide'

const REWIND_EASE = [.83, 0, .17, 1] as const

const BRAND_POSITION =
  'absolute left-6 top-[max(1.5rem,env(safe-area-inset-top))] font-serif text-lg font-normal tracking-[0.32em]'

type Props = {
  places: Place[]
  hotelName: string
}

export function SwipeFeed({ places, hotelName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)
  const touchStartScroll = useRef(0)
  const firstSlideAnimating = useRef(false)
  const isRewindingRef = useRef(false)

  const [activeIndex, setActiveIndex] = useState(0)
  const [isRewinding, setIsRewinding] = useState(false)
  const [darkBrand, setDarkBrand] = useState(false)
  const brandRef = useRef<HTMLButtonElement>(null)

  const lastIndex = places.length + 1

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let frame = 0

    const onScroll = () => {
      cancelAnimationFrame(frame)

      frame = requestAnimationFrame(() => {
        setActiveIndex(
          Math.round(el.scrollTop / el.clientHeight)
        )
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Make the first upward swipe reliably open Postcard 01.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        touchStartY.current = null
        return
      }

      touchStartY.current = event.touches[0].clientY
      touchStartScroll.current = el.scrollTop
    }

    const onTouchEnd = (event: TouchEvent) => {
      const startY = touchStartY.current
      touchStartY.current = null

      if (
        startY === null ||
        event.changedTouches.length !== 1 ||
        firstSlideAnimating.current ||
        isRewindingRef.current ||
        places.length === 0
      ) {
        return
      }

      const distance =
        startY - event.changedTouches[0].clientY

      // Only handle upward gestures beginning on the welcome screen.
      if (
        distance < 25 ||
        touchStartScroll.current > el.clientHeight * .1
      ) {
        return
      }

      firstSlideAnimating.current = true

      // Temporarily disable snapping so the browser cannot
      // pull the feed back to the welcome screen.
      el.style.scrollSnapType = 'none'

      const destination = el.clientHeight

      const finish = () => {
        el.scrollTop = destination
        el.style.scrollSnapType = ''
        firstSlideAnimating.current = false
        setActiveIndex(1)
      }

      if (
        window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches
      ) {
        finish()
        return
      }

      animate(el.scrollTop, destination, {
        duration: .5,
        ease: [.22, 1, .36, 1],
        onUpdate: (value) => {
          el.scrollTop = value
        },
        onComplete: finish,
      })
    }

    const onTouchCancel = () => {
      touchStartY.current = null
    }

    el.addEventListener('touchstart', onTouchStart, {
      passive: true,
    })

    el.addEventListener('touchend', onTouchEnd, {
      passive: true,
    })

    el.addEventListener('touchcancel', onTouchCancel, {
      passive: true,
    })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [places.length])

  const backToTop = useCallback(() => {
    const el = containerRef.current
    if (!el || isRewindingRef.current) return

    if (
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
    ) {
      el.scrollTo({ top: 0 })
      setActiveIndex(0)
      return
    }

    isRewindingRef.current = true
    setIsRewinding(true)
    el.style.scrollSnapType = 'none'

    animate(el.scrollTop, 0, {
      duration: 1.6,
      ease: REWIND_EASE,
      onUpdate: (value) => {
        el.scrollTop = value
      },
      onComplete: () => {
        el.scrollTop = 0
        el.style.scrollSnapType = ''
        isRewindingRef.current = false
        setIsRewinding(false)
        setActiveIndex(0)
      },
    })
  }, [])

  const showChrome =
    activeIndex > 0 && activeIndex < lastIndex && places[activeIndex - 1]?.showText !== false

  useEffect(() => {
    setDarkBrand(false)
    if (!showChrome) return
    const section = containerRef.current?.children[activeIndex]
    const artwork = section?.querySelector('img')
    if (!section || !artwork) return
    let cancelled = false
    let frame = 0
    let source: HTMLImageElement | null = null

    const sample = () => {
      if (cancelled || !source?.naturalWidth || !brandRef.current) return
      const imageRect = artwork.getBoundingClientRect()
      const logoRect = brandRef.current.getBoundingClientRect()
      const sectionRect = section.getBoundingClientRect()
      const scale = Math.max(imageRect.width / source.naturalWidth, imageRect.height / source.naturalHeight)
      if (!scale) return
      const left = imageRect.left + (imageRect.width - source.naturalWidth * scale) / 2
      const top = imageRect.top + (imageRect.height - source.naturalHeight * scale) / 2
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 8
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      try {
        ctx.drawImage(source, (logoRect.left - left) / scale, (logoRect.top - top) / scale, logoRect.width / scale, logoRect.height / scale, 0, 0, 32, 8)
        const pixels = ctx.getImageData(0, 0, 32, 8).data
        const y = Math.max(0, Math.min(1, (logoRect.top + logoRect.height / 2 - sectionRect.top) / sectionRect.height))
        // Account for the existing dark gradient over the artwork.
        const shade = y < .5 ? .60 - 1.1 * y : .05 + 1.7 * (y - .5)
        const linear = (v: number) => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)
        let luminance = 0
        for (let i = 0; i < pixels.length; i += 4) {
          luminance += .2126 * linear((pixels[i] * (1 - shade) + 11 * shade) / 255)
            + .7152 * linear((pixels[i + 1] * (1 - shade) + 10 * shade) / 255)
            + .0722 * linear((pixels[i + 2] * (1 - shade) + 9 * shade) / 255)
        }
        setDarkBrand(luminance / (pixels.length / 4) > .179)
      } catch {
        setDarkBrand(false)
      }
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(sample)
    }
    const load = () => {
      if (cancelled || !artwork.currentSrc) return
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { if (!cancelled) { source = img; schedule() } }
      img.onerror = () => { if (!cancelled) setDarkBrand(false) }
      img.src = artwork.currentSrc
    }
    artwork.addEventListener('load', load)
    window.addEventListener('resize', schedule)
    containerRef.current?.addEventListener('scroll', schedule, { passive: true })
    const container = containerRef.current
    if (artwork.complete) load()
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      artwork.removeEventListener('load', load)
      window.removeEventListener('resize', schedule)
      container?.removeEventListener('scroll', schedule)
    }
  }, [activeIndex, showChrome, places])

  return (
    <div className="relative mx-auto h-dvh w-full overflow-hidden bg-ink sm:max-w-[calc(100dvh*9/16)] sm:shadow-[0_0_80px_rgba(0,0,0,0.6)]">
      <div
        ref={containerRef}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      >
        <TitleSlide
          isActive={activeIndex === 0}
          count={places.length}
        />

        {places.map((place, i) => (
          <PlaceSlide
            key={place.id}
            place={place}
            index={i + 1}
            total={places.length}
            isActive={activeIndex === i + 1}
          />
        ))}

        <OutroSlide
          isActive={activeIndex === lastIndex}
          isRewinding={isRewinding}
          onBackToTop={backToTop}
          hotelName={hotelName}
        />
      </div>

      <AnimatePresence>
        {showChrome && (
          <>
            <motion.button
              key="brand"
              ref={brandRef}
              type="button"
              onClick={backToTop}
              aria-label="THE LIST – back to top"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{
                duration: .6,
                ease: [.22, 1, .36, 1],
              }}
              className={`${BRAND_POSITION} z-20 ${darkBrand ? "text-black" : "text-white"}`}
              style={{ textShadow: darkBrand ? "0 1px 3px rgba(255,255,255,.65)" : "0 1px 3px rgba(0,0,0,.85)" }}
            >
              THE LIST
            </motion.button>

          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRewinding && (
          <motion.div
            key="rewind"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-ink/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: .5,
              ease: 'easeInOut',
            }}
          >
            <motion.span
              className="block h-px w-24 origin-center bg-champagne"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{
                duration: .8,
                ease: [.22, 1, .36, 1],
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
