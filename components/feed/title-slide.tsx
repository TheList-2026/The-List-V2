
'use client'

import { AnimatePresence, animate, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { Place } from '@/lib/places'
import { OutroSlide } from './outro-slide'
import { PlaceSlide } from './place-slide'
import { TitleSlide } from './title-slide'

const REWIND_EASE = [.83, 0, .17, 1] as const

const BRAND_POSITION =
  'absolute left-6 top-[max(1.5rem,env(safe-area-inset-top))] font-serif text-lg font-normal tracking-[0.32em]'

export function SwipeFeed({
  places,
  hotelName,
}: {
  places: Place[]
  hotelName: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)
  const touchHandled = useRef(false)
  const firstSlideAnimating = useRef(false)
  const activeIndexRef = useRef(0)

  const [activeIndex, setActiveIndex] = useState(0)
  const [isRewinding, setIsRewinding] = useState(false)

  const lastIndex = places.length + 1

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let frame = 0

    const onScroll = () => {
      cancelAnimationFrame(frame)

      frame = requestAnimationFrame(() => {
        const nextIndex = Math.round(
          el.scrollTop / el.clientHeight
        )

        activeIndexRef.current = nextIndex
        setActiveIndex(nextIndex)
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const goToFirstPostcard = useCallback(() => {
    const el = containerRef.current

    if (
      !el ||
      isRewinding ||
      firstSlideAnimating.current ||
      places.length === 0
    ) {
      return
    }

    firstSlideAnimating.current = true

    const destination = el.clientHeight

    el.style.scrollSnapType = 'none'

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion) {
      el.scrollTop = destination
      el.style.scrollSnapType = ''
      firstSlideAnimating.current = false
      activeIndexRef.current = 1
      setActiveIndex(1)
      return
    }

    animate(el.scrollTop, destination, {
      duration: .65,
      ease: [.22, 1, .36, 1],

      onUpdate: (value) => {
        el.scrollTop = value
      },

      onComplete: () => {
        el.scrollTop = destination
        el.style.scrollSnapType = ''
        firstSlideAnimating.current = false
        activeIndexRef.current = 1
        setActiveIndex(1)
      },
    })
  }, [isRewinding, places.length])

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return

      touchStartY.current = event.touches[0].clientY
      touchHandled.current = false
    },
    []
  )

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (
        touchStartY.current === null ||
        touchHandled.current ||
        firstSlideAnimating.current ||
        isRewinding
      ) {
        return
      }

      const el = containerRef.current
      if (!el) return

      // Only intervene while the welcome screen is visible.
      if (
        activeIndexRef.current !== 0 ||
        el.scrollTop > el.clientHeight * .15
      ) {
        return
      }

      const distance =
        touchStartY.current - event.touches[0].clientY

      // A deliberate upward swipe moves to Postcard 01.
      if (distance > 35) {
        touchHandled.current = true
        goToFirstPostcard()
      }
    },
    [goToFirstPostcard, isRewinding]
  )

  const handleTouchEnd = useCallback(() => {
    touchStartY.current = null
    touchHandled.current = false
  }, [])

  const backToTop = useCallback(() => {
    const el = containerRef.current

    if (!el || isRewinding) return

    if (
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
    ) {
      el.scrollTo({ top: 0 })
      return
    }

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
        setIsRewinding(false)
        activeIndexRef.current = 0
        setActiveIndex(0)
      },
    })
  }, [isRewinding])

  const showChrome =
    activeIndex > 0 && activeIndex < lastIndex

  return (
    <div className="relative mx-auto h-dvh w-full overflow-hidden bg-ink sm:max-w-[calc(100dvh*9/16)] sm:shadow-[0_0_80px_rgba(0,0,0,0.6)]">
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      >
        <TitleSlide
          isActive={activeIndex === 0}
          count={places.length}
        />

        {places.map((place, index) => (
          <PlaceSlide
            key={place.id}
            place={place}
            index={index + 1}
            total={places.length}
            isActive={activeIndex === index + 1}
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
              className={`${BRAND_POSITION} z-20 text-white mix-blend-difference`}
            >
              THE LIST
            </motion.button>

            <motion.span
              key="brand-mono"
              aria-hidden="true"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{
                duration: .6,
                ease: [.22, 1, .36, 1],
              }}
              className={`${BRAND_POSITION} pointer-events-none z-20 text-white mix-blend-saturation`}
            >
              THE LIST
            </motion.span>
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
