"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type Props = {
  measurementId: string
}

export function GoogleAnalytics({ measurementId }: Props) {
  const pathname = usePathname()
  const skipFirstPath = useRef(true)

  useEffect(() => {
    if (!measurementId || typeof window.gtag !== "function") return
    if (skipFirstPath.current) {
      skipFirstPath.current = false
      return
    }
    window.gtag("config", measurementId, { page_path: pathname })
  }, [pathname, measurementId])

  if (!measurementId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: true });
        `}
      </Script>
    </>
  )
}
