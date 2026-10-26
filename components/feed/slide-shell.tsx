'use client'
import Image from 'next/image'
import {motion} from 'framer-motion'
import type {ReactNode} from 'react'
type Props={image:string;alt:string;isActive:boolean;priority?:boolean;label:string;centered?:boolean;children:ReactNode}
export function SlideShell({image,alt,isActive,priority,label,centered,children}:Props){return <section aria-label={label} className="relative h-dvh w-full snap-start snap-always overflow-hidden bg-ink"><motion.div className="absolute inset-0" initial={false} animate={{scale:isActive?1:1.08}} transition={{duration:6,ease:[0.22,1,0.36,1]}}><Image src={image} alt={alt} fill priority={priority} unoptimized={image.startsWith('data:')} sizes="(max-width:640px) 100vw,480px" className="object-cover"/></motion.div><div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/5 to-ink/90"/>{centered&&<div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,10,9,0.55)_0%,rgba(11,10,9,0)_65%)]"/>}<div className="relative z-10 flex h-full flex-col">{children}</div></section>}
