
'use client'

import { motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { outro } from '@/lib/places'
import { SlideShell } from './slide-shell'

const ease = [.22, 1, .36, 1] as const

type Props = {
  isActive: boolean
  isRewinding: boolean
  onBackToTop: () => void
  hotelName: string
}

export function OutroSlide({
  isActive,
  isRewinding,
  onBackToTop,
  hotelName,
}: Props) {
  return (
    <SlideShell
      image={outro.image}
      alt="Elegant envelope with a gold wax seal"
      isActive={isActive}
      label="Enjoy your stay"
      centered
    >
      <motion.div
        initial={false}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
        transition={{ duration: 1, delay: 0.2, ease }}
        className="absolute left-4 right-4 top-[max(4rem,env(safe-area-inset-top))] text-center"
      >
        <p className="font-serif text-[15px] uppercase tracking-[0.22em] text-champagne [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
          {hotelName}
        </p>
      </motion.div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.h2
          initial={false}
          animate={
            isActive
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 24, filter: 'blur(8px)' }
          }
          transition={{ duration: 1.2, delay: 0.35, ease }}
          className="text-balance font-serif text-5xl font-light italic leading-[1.05] text-ivory [text-shadow:0_2px_16px_rgba(0,0,0,0.65)]"
        >
          Enjoy your stay
        </motion.h2>

        <motion.span
          aria-hidden="true"
          className="mt-7 block h-px w-16 bg-champagne/70"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isActive ? 1 : 0 }}
          transition={{ duration: 1.2, delay: 0.7, ease }}
        />

        <motion.p
          initial={false}
          animate={
            isActive
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 12 }
          }
          transition={{ duration: 1, delay: 0.85, ease }}
          className="mt-7 max-w-[30ch] text-pretty text-[15px] font-medium leading-relaxed text-ivory [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]"
        >
          Every place on this list was chosen with care. We hope they become
          part of your story.
        </motion.p>
      </div>

      <motion.div
        initial={false}
        animate={
          isActive
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 16 }
        }
        transition={{ duration: 0.9, delay: 1.1, ease }}
        className="flex justify-center px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]"
      >
        <motion.button
          type="button"
          onClick={onBackToTop}
          disabled={isRewinding}
          whileHover="hover"
          whileTap={{ scale: 0.96 }}
          className="glass-soft group flex h-14 items-center gap-4 overflow-hidden rounded-full pl-2 pr-7 text-ivory transition-colors duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne disabled:opacity-60"
        >
          <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-champagne text-ink">
            <motion.span
              className="absolute"
              variants={{ hover: { y: -28 } }}
              transition={{ duration: 0.4, ease }}
            >
              <ArrowUp className="size-4 stroke-[1.75]" />
            </motion.span>

            <motion.span
              className="absolute"
              initial={{ y: 28 }}
              variants={{ hover: { y: 0 } }}
              transition={{ duration: 0.4, ease }}
            >
              <ArrowUp className="size-4 stroke-[1.75]" />
            </motion.span>
          </span>

          <span className="text-[11px] font-medium uppercase tracking-[0.3em]">
            Back to top
          </span>
        </motion.button>
      </motion.div>
    </SlideShell>
  )
}
