
'use client'

import { motion } from 'framer-motion'
import type { Place } from '@/lib/places'
import { ActionBar } from './action-bar'
import { SlideShell } from './slide-shell'

const ease = [.22, 1, .36, 1] as const

function reveal(active: boolean, delay: number) {
  return {
    initial: false as const,
    animate: active
      ? {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
        }
      : {
          opacity: 0,
          y: 24,
          filter: 'blur(6px)',
        },
    transition: {
      duration: .9,
      delay: active ? delay : 0,
      ease,
    },
  }
}

export function PlaceSlide({
  place,
  index,
  total,
  isActive,
}: {
  place: Place
  index: number
  total: number
  isActive: boolean
}) {
  return (
    <SlideShell
      image={place.image}
      alt={`${place.name}, ${place.category.toLowerCase()} in ${place.location}`}
      isActive={isActive}
      label={`${place.name} – ${index} of ${total}`}
    >
      {/* BUSINESS DETAILS */}
      <div className="mt-auto px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        {place.showText !== false && <motion.h2
          {...reveal(isActive, .15)}
          className="text-balance font-serif text-5xl font-light leading-[0.95] tracking-tight text-ivory"
        >
          {place.name}
        </motion.h2>}

        {place.showText !== false && <motion.p
          {...reveal(isActive, .25)}
          className="mt-4 max-w-[30ch] text-pretty text-sm font-light leading-relaxed text-ivory/80"
        >
          {place.description}
        </motion.p>}

        {/* EXISTING ACTION BUTTONS — UNCHANGED */}
        <div className="mt-7">
          <ActionBar place={place} isActive={isActive} />
        </div>
      </div>
    </SlideShell>
  )
}
