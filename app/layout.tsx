import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import './globals.css'
const cormorant=Cormorant_Garamond({subsets:['latin'],weight:['300','400','500'],style:['normal','italic'],variable:'--font-cormorant'})
const manrope=Manrope({subsets:['latin'],weight:['300','400','500','600'],variable:'--font-manrope'})
export const metadata:Metadata={title:'THE LIST | A private guide',description:'The places worth knowing, chosen for your stay.'}
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0b0a09'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${cormorant.variable} ${manrope.variable} bg-ink`}><body className="bg-ink font-sans text-ivory antialiased">{children}<Analytics/></body></html>}
