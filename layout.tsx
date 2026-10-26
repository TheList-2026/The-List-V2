import type { Metadata } from "next";import "./globals.css";
export const metadata: Metadata = { title: "THE LIST | An Invitation to Discover", description: "A private guide to places worth knowing." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
