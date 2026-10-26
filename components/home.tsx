
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { SlideShell } from '@/components/feed/slide-shell'
import { intro } from '@/lib/places'
import { WorkModal } from '@/components/work-modal'

export function Home() {
  const openWorkModal = () => {
    window.dispatchEvent(new Event('thelist:enquire'))
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink">
      <div className="relative mx-auto h-dvh w-full sm:max-w-[calc(100dvh*9/16)]">
        <SlideShell
          image={intro.image}
          alt="Mediterranean luxury hotel at dusk"
          isActive={true}
          priority
          label="The List"
          centered
        >
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-[10px] font-medium uppercase tracking-[.42em] text-champagne"
            >
              {intro.eyebrow}
            </motion.p>

            <h1 className="mt-6 whitespace-nowrap font-serif text-[3.25rem] font-light leading-none text-ivory">
              <motion.span
                className="block pl-[.3em] tracking-[.3em]"
                initial={{
                  opacity: 0,
                  letterSpacing: '.6em',
                  filter: 'blur(10px)',
                }}
                animate={{
                  opacity: 1,
                  letterSpacing: '.3em',
                  filter: 'blur(0px)',
                }}
                transition={{
                  duration: 1.6,
                  delay: 0.3,
                  ease: [.22, 1, .36, 1],
                }}
              >
                {intro.title}
              </motion.span>
            </h1>

            <motion.span
              aria-hidden="true"
              className="mt-8 block h-px w-16 bg-champagne/70"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, delay: 0.9 }}
            />

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.1 }}
              className="mt-8 max-w-[26ch] text-balance font-serif text-xl font-light italic leading-snug text-ivory/85"
            >
              {intro.tagline}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.4 }}
              className="mt-12"
            >
              <Link
                href="/hotel/puente-romano-marbella"
                className="glass-soft inline-flex items-center justify-center rounded-full px-8 py-4 text-[10px] uppercase tracking-[.27em] text-ivory"
              >
                Explore the Marbella edit
              </Link>
            </motion.div>
          </div>
        </SlideShell>

        {/* Always visible on mobile and desktop */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4"
          style={{
            paddingBottom:
              'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          }}
        >
          <button
            type="button"
            onClick={openWorkModal}
            className="pointer-events-auto rounded-full border border-champagne/35 bg-ink/60 px-6 py-3 text-[10px] font-medium uppercase tracking-[.25em] text-champagne shadow-lg backdrop-blur-md transition-colors hover:border-champagne/70 hover:bg-ink/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-champagne"
          >
            Work with us
          </button>
        </div>
      </div>

      <WorkModal />
    </main>
  )
}
