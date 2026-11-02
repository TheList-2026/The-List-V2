
'use client'

import { motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

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
    <section
      aria-label="Enjoy your stay"
      className="relative flex h-dvh w-full snap-start snap-always flex-col overflow-hidden bg-[#101010]"
    >
      <motion.div
        initial={false}
        animate={
          isActive
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: -12 }
        }
        transition={{ duration: 1, delay: .2, ease }}
        className="px-6 pt-[max(5rem,env(safe-area-inset-top))] text-center"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-champagne">
          From the concierge at
        </p>

        <h2 className="mt-4 font-serif text-2xl font-light uppercase tracking-[0.12em] text-ivory">
          {hotelName}
        </h2>
      </motion.div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.h3
          initial={false}
          animate={
            isActive
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 24, filter: 'blur(8px)' }
          }
          transition={{ duration: 1.2, delay: .35, ease }}
          className="font-serif text-5xl font-light italic leading-[1.05] text-ivory"
        >
          Enjoy your stay
        </motion.h3>

        <motion.span
          aria-hidden="true"
          className="mt-8 block h-px w-16 bg-champagne/70"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isActive ? 1 : 0 }}
          transition={{ duration: 1.2, delay: .7, ease }}
        />

        <motion.p
          initial={false}
          animate={
            isActive
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 12 }
          }
          transition={{ duration: 1, delay: .85, ease }}
          className="mt-8 max-w-[30ch] text-pretty text-[15px] font-light leading-relaxed text-ivory/85"
        >
          Every place on this list was chosen with care.
          We hope they become part of your story.
        </motion.p>
      </div>

      <motion.div
        initial={false}
        animate={
          isActive
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 16 }
        }
        transition={{ duration: .9, delay: 1.1, ease }}
        className="flex justify-center px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]"
      >
        <motion.button
          type="button"
          onClick={onBackToTop}
          disabled={isRewinding}
          whileHover="hover"
          whileTap={{ scale: .96 }}
          className="glass-soft group flex h-14 items-center gap-4 overflow-hidden rounded-full pl-2 pr-7 text-ivory transition-colors duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne disabled:opacity-60"
        >
          <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-champagne text-ink">
            <motion.span
              className="absolute"
              variants={{ hover: { y: -28 } }}
              transition={{ duration: .4, ease }}
            >
              <ArrowUp className="size-4 stroke-[1.75]" />
            </motion.span>

            <motion.span
              className="absolute"
              initial={{ y: 28 }}
              variants={{ hover: { y: 0 } }}
              transition={{ duration: .4, ease }}
            >
              <ArrowUp className="size-4 stroke-[1.75]" />
            </motion.span>
          </span>

          <span className="text-[11px] font-medium uppercase tracking-[0.3em]">
            Back to top
          </span>
        </motion.button>
      </motion.div>
    </section>
  )
}
